import os
import json
import io
import urllib.request
from urllib.parse import urlparse
from typing import Optional
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from google import genai
from google.genai import types
from fastapi.responses import Response

app = FastAPI(title="Resume React - Python Service")

_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials
        key_path = os.environ.get("FIREBASE_ADMIN_KEY_PATH")
        if key_path and os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
        _firebase_initialized = True
        return True
    except Exception:
        return False

def verify_firebase_token(authorization: Optional[str]) -> Optional[str]:
    if not _firebase_initialized:
        if not init_firebase():
            return None
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ")[1]
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(token)
        return decoded.get("uid")
    except Exception:
        return None

_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        from PIL import Image
        from paddleocr import PaddleOCR
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang="pt", show_log=False)
    return _ocr_instance

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is not None:
        return _genai_client

    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        try:
            from google.cloud import secretmanager
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{os.environ.get('GOOGLE_CLOUD_PROJECT')}/secrets/gemini-api-key/versions/latest"
            response = client.access_secret_version(request={"name": name})
            api_key = response.payload.data.decode("utf-8")
        except Exception:
            pass

    _genai_client = genai.Client(api_key=api_key)
    return _genai_client


def _is_retryable_error(e: Exception) -> bool:
    msg = str(e).lower()
    status = getattr(e, "code", 0) if hasattr(e, "code") else 0
    retryable_codes = {429, 500, 502, 503, 504}
    if status in retryable_codes:
        return True
    for keyword in ("resource exhausted", "unavailable", "deadline exceeded", "too many requests", "internal server error"):
        if keyword in msg:
            return True
    return False

def call_gemini_with_retry(client, model, contents=None, config=None):
    import time
    last_error = None
    for attempt in range(3):
        try:
            if config:
                return client.models.generate_content(model=model, contents=contents, config=config)
            return client.models.generate_content(model=model, contents=contents)
        except Exception as e:
            last_error = e
            if attempt < 2 and _is_retryable_error(e):
                delay = 2 ** (attempt + 1)
                print(f"    [retry] Gemini falhou (tentativa {attempt + 1}/3), tentando novamente em {delay}s: {e}")
                time.sleep(delay)
            else:
                raise
    raise last_error


class ParseResumeRequest(BaseModel):
    fileUrl: str
    uid: str


class EditResumeRequest(BaseModel):
    resumeData: dict
    jobDescription: str
    templateType: str = "ats"
    instructions: Optional[str] = None


class OcrJobRequest(BaseModel):
    photoUrl: str


class GeneratePdfRequest(BaseModel):
    htmlContent: str


class GenerateEmailRequest(BaseModel):
    resumeHtml: str
    jobTitle: str
    companyName: str
    hiringManager: Optional[str] = None


RESUME_SYSTEM_PROMPT = """Você é um especialista em curadoria de currículos focado em ATS (Applicant Tracking Systems).
Sua função é adaptar currículos para vagas específicas seguindo rigorosamente estas regras:

1. EXTRAIA palavras-chave exatas da descrição da vaga e incorpore-as naturalmente
2. NUNCA invente qualificações, certificações ou experiências que não estão no currículo original
3. Use sinônimos e paráfrases para evitar marcas de IA (mesmas palavras, frases muito rebuscadas)
4. Priorize verbos de ação fortes (implementou, liderou, otimizou, desenvolveu) em vez de "responsável por"
5. Mantenha o currículo em 1-2 páginas
6. Preserve a cronologia exata das experiências - não reorganize datas
7. Formate a saída como HTML bem estruturado para conversão em PDF
8. IDIOMA: Responda EM PORTUGUÊS (pt-BR)"""

EMAIL_SYSTEM_PROMPT = """Você é um assistente de comunicação profissional.
Gere um email em HTML bem formatado e humanizado para envio de currículo.
O email deve ser educado, profissional e direto ao ponto.
IDIOMA: Responda EM PORTUGUÊS (pt-BR).
Retorne um JSON com dois campos: subject (assunto do email) e body (HTML do corpo)."""


def extract_json_from_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        idx = text.find("\n")
        if idx != -1:
            text = text[idx:].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("```json"):
        text = text[7:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_IMAGE_DIMENSIONS = (4000, 4000)

ALLOWED_MAGIC_BYTES = {
    "pdf": (b"%PDF", 5),
    "png": (b"\x89PNG", 4),
    "jpeg": (b"\xff\xd8\xff", 3),
    "webp": (b"RIFF", 4),
}

def validate_url_scheme(url: str):
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise HTTPException(
            status_code=400, detail="Apenas URLs HTTPS são permitidas"
        )

def download_file(url: str) -> bytes:
    validate_url_scheme(url)
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            content = response.read(MAX_DOWNLOAD_BYTES + 1)
            if len(content) > MAX_DOWNLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="Arquivo excede o limite de 50MB",
                )
            return content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao baixar arquivo: {str(e)}")

def validate_pdf_magic(data: bytes):
    magic, length = ALLOWED_MAGIC_BYTES["pdf"]
    if not data.startswith(magic):
        raise HTTPException(
            status_code=422, detail="Arquivo não é um PDF válido"
        )

def validate_image_dimensions(image) -> None:
    if image.width > ALLOWED_IMAGE_DIMENSIONS[0] or image.height > ALLOWED_IMAGE_DIMENSIONS[1]:
        raise HTTPException(
            status_code=422,
            detail=f"Imagem muito grande (máx {ALLOWED_IMAGE_DIMENSIONS[0]}x{ALLOWED_IMAGE_DIMENSIONS[1]}px)",
        )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse-resume")
async def parse_resume(req: ParseResumeRequest):
    try:
        pdf_bytes = download_file(req.fileUrl)
        validate_pdf_magic(pdf_bytes)
        extracted_text = ""

        try:
            import fitz
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_parts = []
            for page in doc:
                text_parts.append(page.get_text())
            doc.close()
            extracted_text = "\n".join(text_parts)
        except ImportError:
            pass

        if not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Não foi possível extrair texto do PDF.",
            )

        prompt = f"""Extraia os dados estruturados deste currículo em texto.
Retorne um JSON com: nome, email, telefone, endereco, resumoProfissional,
experiencias (lista com empresa, cargo, periodo, descricao),
educacao (lista com instituicao, curso, periodo),
habilidades (lista de strings),
idiomas (lista com idioma, nivel),
certificacoes (lista com nome, instituicao, ano).

Texto do currículo:
{extracted_text}

Retorne APENAS o JSON, sem formatação markdown."""

        response = call_gemini_with_retry(
            get_genai_client(),
            model="gemini-flash-latest",
            contents=[prompt],
        )

        data = extract_json_from_response(response.text)
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/edit-resume")
async def edit_resume(req: EditResumeRequest):
    try:
        resume_str = json.dumps(req.resumeData, ensure_ascii=False, indent=2)
        prompt = f"""Com base nos dados estruturados do currículo abaixo e na descrição da vaga,
gere um currículo adaptado em HTML formatado para conversão em PDF.

{('Instruções adicionais: ' + req.instructions) if req.instructions else ''}

Dados do currículo:
{resume_str}

Descrição da vaga:
{req.jobDescription}

Formato HTML esperado:
- Use <div> com estilos inline (WeasyPrint compatível)
- Fonte: Arial, sans-serif
- Cores: #1a3c5e para títulos, #333 para texto
- Margens: 20mm
- Seções: Dados Pessoais, Resumo, Experiência, Educação, Habilidades, Idiomas
- Máximo 2 páginas
- Retorne APENAS o HTML, sem formatação markdown"""

        response = call_gemini_with_retry(
            get_genai_client(),
            model="gemini-flash-latest",
            config=types.GenerateContentConfig(
                system_instruction=RESUME_SYSTEM_PROMPT,
            ),
            contents=[prompt],
        )

        return {"success": True, "html": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ocr-job")
async def ocr_job(req: OcrJobRequest):
    try:
        image_bytes = download_file(req.photoUrl)
        image_io = io.BytesIO(image_bytes)

        from PIL import Image
        Image.MAX_IMAGE_PIXELS = ALLOWED_IMAGE_DIMENSIONS[0] * ALLOWED_IMAGE_DIMENSIONS[1] * 4
        image = Image.open(image_io)
        validate_image_dimensions(image)
        ocr = get_ocr()
        result = ocr.ocr(image, cls=True)

        text_lines = []
        if result and result[0]:
            for line in result[0]:
                text_lines.append(line[1][0])

        full_text = "\n".join(text_lines)

        prompt = f"""Extraia e organize as informações desta descrição de vaga em português.
Retorne um JSON com: cargo, empresa (se disponível), descricao, requisitos (lista),
responsabilidades (lista), diferencial (lista), local, tipo (CLT/PJ/Remoto/etc).

Texto extraído:
{full_text}

Retorne APENAS o JSON, sem formatação markdown."""

        response = call_gemini_with_retry(
            get_genai_client(),
            model="gemini-flash-latest",
            contents=[prompt],
        )

        data = extract_json_from_response(response.text)
        return {"success": True, "data": data, "rawText": full_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-pdf")
async def generate_pdf(req: GeneratePdfRequest):
    try:
        from weasyprint import HTML
        html_str = req.htmlContent
        if not html_str.strip().startswith("<"):
            html_str = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@page {{ margin: 20mm; }}
body {{ font-family: Arial, sans-serif; font-size: 12pt; color: #333; line-height: 1.6; }}
h1, h2, h3 {{ color: #1a3c5e; }}
h1 {{ font-size: 16pt; }}
h2 {{ font-size: 14pt; border-bottom: 1px solid #1a3c5e; padding-bottom: 4px; }}
</style></head><body>{html_str}</body></html>"""

        pdf_bytes = HTML(string=html_str).write_pdf()
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-email")
async def generate_email(req: GenerateEmailRequest):
    try:
        prompt = f"""Gere um email profissional para envio de currículo em português.

Cargo: {req.jobTitle}
Empresa: {req.companyName}
{f'Contato: {req.hiringManager}' if req.hiringManager else ''}

Currículo (HTML):
{req.resumeHtml}

Retorne um JSON com subject e body.
Exemplo: {{"subject": "Candidatura — Engenheiro de Software Sênior", "body": "<p>...</p>"}}"""

        response = call_gemini_with_retry(
            get_genai_client(),
            model="gemini-flash-latest",
            config=types.GenerateContentConfig(
                system_instruction=EMAIL_SYSTEM_PROMPT,
            ),
            contents=[prompt],
        )

        result = extract_json_from_response(response.text)
        return {
            "success": True,
            "subject": result.get("subject", f"Candidatura — {req.jobTitle}"),
            "body": result.get("body", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
