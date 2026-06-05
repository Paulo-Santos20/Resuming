import os
import json
import base64
import io
import urllib.request
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from weasyprint import HTML
from fastapi.responses import Response

app = FastAPI(title="Resume React - Python Service")

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


def download_file(url: str) -> bytes:
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            return response.read()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao baixar arquivo: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse-resume")
async def parse_resume(req: ParseResumeRequest):
    try:
        pdf_bytes = download_file(req.fileUrl)
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

        response = get_genai_client().models.generate_content(
            model="gemini-2.0-flash",
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

        response = get_genai_client().models.generate_content(
            model="gemini-2.0-flash",
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
        image = Image.open(image_io)
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

        response = get_genai_client().models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt],
        )

        data = extract_json_from_response(response.text)
        return {"success": True, "data": data, "rawText": full_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-pdf")
async def generate_pdf(req: GeneratePdfRequest):
    try:
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

        response = get_genai_client().models.generate_content(
            model="gemini-2.0-flash",
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
