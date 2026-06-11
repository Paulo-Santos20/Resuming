import os
import json
import io
import random
import re
import traceback
import asyncio
import http.client
from urllib.parse import urlparse
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from google import genai
from google.genai import types
from groq import Groq
from openai import OpenAI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

app = FastAPI(title="Resuming - Python Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://resuming-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_firebase_initialized = False
_firebase_init_error = ""

def init_firebase():
    global _firebase_initialized, _firebase_init_error
    if _firebase_initialized:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials
        key_path = os.environ.get("FIREBASE_ADMIN_KEY_PATH")
        if key_path and os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            return True

        client_email = os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL")
        raw_key = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY", "")
        import base64
        if raw_key.startswith("LS0t") or (len(raw_key) > 200 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" for c in raw_key.strip())):
            raw_key = base64.b64decode(raw_key).decode("utf-8")
        private_key = raw_key.replace("\\n", "\n").strip('"').strip("'")
        project_id = os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID")

        if client_email and private_key:
            cred = credentials.Certificate({
                "type": "service_account",
                "client_email": client_email,
                "private_key": private_key,
                "project_id": project_id,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            return True

        firebase_admin.initialize_app()
        _firebase_initialized = True
        return True
    except Exception as e:
        _firebase_init_error = f"{type(e).__name__}: {e}"
        print(f"[Firebase] init error: {_firebase_init_error}")
        return False

def verify_firebase_token(authorization: Optional[str]) -> Optional[str]:
    if not _firebase_initialized:
        if not init_firebase():
            return None
    if not authorization:
        return None
    token = authorization
    if token.startswith("Bearer "):
        token = token.split("Bearer ")[1]
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(token)
        return decoded.get("uid")
    except Exception:
        return None

security = HTTPBearer(auto_error=False)

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not _firebase_initialized:
        init_firebase()
    if not _firebase_initialized:
        raise HTTPException(status_code=503, detail="Serviço de autenticação indisponível")
    uid = verify_firebase_token(credentials.credentials if credentials else None)
    if uid is None:
        raise HTTPException(status_code=401, detail="Não autorizado")
    return uid

_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        from paddleocr import PaddleOCR
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang="pt", show_log=False)
    return _ocr_instance


def ocr_file(file_bytes: bytes) -> str:
    import numpy as np
    from PIL import Image

    is_pdf = file_bytes[:4] == b"%PDF"

    if is_pdf:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        try:
            text_parts = []
            for page in doc:
                text = page.get_text().strip()
                if text:
                    text_parts.append(text)
                else:
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    img_np = np.array(img)
                    ocr = get_ocr()
                    result = ocr.ocr(img_np, cls=True)
                    if result and len(result) > 0 and result[0] and len(result[0]) > 0:
                        text_parts.append("\n".join(line[1][0] for line in result[0]))
        finally:
            doc.close()
        return "\n\n".join(text_parts)
    else:
        img = Image.open(io.BytesIO(file_bytes))
        validate_image_dimensions(img)
        img_np = np.array(img.convert("RGB"))
        ocr = get_ocr()
        result = ocr.ocr(img_np, cls=True)
        if result and len(result) > 0 and result[0] and len(result[0]) > 0:
            return "\n".join(line[1][0] for line in result[0])
        return ""

GEMINI_MODEL = "gemini-2.5-flash"


def _get_api_keys() -> list[str]:
    keys = os.environ.get("GEMINI_API_KEY", "")
    return [k.strip() for k in keys.split(",") if k.strip()]


def get_genai_client(key: Optional[str] = None):
    api_key = key
    if not api_key:
        keys = _get_api_keys()
        api_key = keys[0] if keys else ""
    if not api_key:
        try:
            from google.cloud import secretmanager
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{os.environ.get('GOOGLE_CLOUD_PROJECT')}/secrets/gemini-api-key/versions/latest"
            response = client.access_secret_version(request={"name": name})
            api_key = response.payload.data.decode("utf-8")
        except Exception:
            pass
    return genai.Client(api_key=api_key, http_options={"timeout": 120000})


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


def _is_quota_error(e: Exception) -> bool:
    msg = str(e).lower()
    status = getattr(e, "code", 0) if hasattr(e, "code") else 0
    return status == 429 or "resource exhausted" in msg or "quota exceeded" in msg


def call_gemini_with_retry(client, model, contents=None, config=None):
    import time
    last_error = None
    for attempt in range(5):
        try:
            if config:
                return client.models.generate_content(model=model, contents=contents, config=config)
            return client.models.generate_content(model=model, contents=contents)
        except Exception as e:
            last_error = e
            if attempt < 4 and _is_retryable_error(e):
                delay = (2 ** (attempt + 2)) + random.uniform(0, 1)
                print(f"    [retry] Gemini falhou (tentativa {attempt + 1}/5), tentando novamente em {delay:.1f}s: {e}")
                time.sleep(delay)
            else:
                raise
    raise last_error


def call_gemini_with_key_rotation(keys=None, model=GEMINI_MODEL, contents=None, config=None):
    if keys is None:
        keys = _get_api_keys()
    if not keys:
        raise ValueError("Nenhuma chave GEMINI_API_KEY configurada")
    for i, key in enumerate(keys):
        try:
            client = get_genai_client(key)
            return call_gemini_with_retry(client, model, contents, config)
        except Exception as e:
            if _is_quota_error(e) and i < len(keys) - 1:
                print(f"    [key rotation] Chave {i+1} quota exaurida, tentando próxima...")
                continue
            raise


async def call_gemini_async(contents=None, config=None):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, lambda: call_gemini_with_key_rotation(contents=contents, config=config)
    )


GROQ_MODEL = "llama-3.3-70b-versatile"


def _get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def call_groq(contents=None, system_instruction=None):
    client = _get_groq_client()
    if not client:
        raise ValueError("GROQ_API_KEY não configurada")

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    if isinstance(contents, list):
        messages.append({"role": "user", "content": "\n".join(str(c) for c in contents)})
    else:
        messages.append({"role": "user", "content": str(contents)})

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=8192,
        timeout=120,
    )
    return response.choices[0].message.content


DEEPSEEK_MODEL = "deepseek-chat"


def _get_deepseek_client():
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return None
    return OpenAI(api_key=api_key, base_url="https://api.deepseek.com")


def call_deepseek(contents=None, system_instruction=None):
    client = _get_deepseek_client()
    if not client:
        raise ValueError("DEEPSEEK_API_KEY não configurada")

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    if isinstance(contents, list):
        messages.append({"role": "user", "content": "\n".join(str(c) for c in contents)})
    else:
        messages.append({"role": "user", "content": str(contents)})

    response = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=8192,
        timeout=120,
    )
    return response.choices[0].message.content


def _extract_system_instruction(config):
    if config and hasattr(config, 'system_instruction'):
        return config.system_instruction
    return None


class FallbackResponse:
    def __init__(self, text):
        self.text = text


async def call_with_fallback(contents=None, config=None):
    system_instruction = _extract_system_instruction(config)

    # 1 — Tenta Gemini
    try:
        return await call_gemini_async(contents=contents, config=config)
    except Exception as e:
        print(f"    [fallback] Gemini falhou após todas as tentativas: {e}")

    # 2 — Tenta Groq
    print(f"    [fallback] Tentando Groq ({GROQ_MODEL})...")
    try:
        text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: call_groq(contents=contents, system_instruction=system_instruction)
        )
        return FallbackResponse(text)
    except Exception as e:
        print(f"    [fallback] Groq também falhou: {e}")

    # 3 — Tenta DeepSeek
    print(f"    [fallback] Tentando DeepSeek ({DEEPSEEK_MODEL})...")
    try:
        text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: call_deepseek(contents=contents, system_instruction=system_instruction)
        )
        return FallbackResponse(text)
    except Exception as e:
        print(f"    [fallback] DeepSeek também falhou: {e}")
        raise


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


ALLOWED_FONTS = {"Arial", "Calibri", "Times New Roman", "Georgia", "Helvetica", "Verdana"}

def validate_generate_pdf_request(req: "GeneratePdfRequest"):
    if req.fontFamily and req.fontFamily not in ALLOWED_FONTS:
        req.fontFamily = "Arial"
    if req.accentColor and not re.match(r'^#[0-9a-fA-F]{6}$', req.accentColor):
        req.accentColor = "#1a3c5e"

class GeneratePdfRequest(BaseModel):
    htmlContent: str
    fontFamily: Optional[str] = "Arial"
    fontSize: Optional[int] = 12
    lineHeight: Optional[float] = 1.6
    sectionSpacing: Optional[int] = 16
    pageMargins: Optional[int] = 20
    accentColor: Optional[str] = "#1a3c5e"
    templateStyle: Optional[str] = "classic"


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
8. IDIOMA: Responda EM PORTUGUÊS (pt-BR)
9. NUNCA use primeira pessoa do singular ("eu fiz", "minha experiência"). Comece as descrições diretamente com verbo de ação no infinitivo ou substantivo: "Gestão de equipe…", "Desenvolvimento de sistema…" em vez de "Eu gerenciei…", "Minha experiência inclui…\""""

EMAIL_SYSTEM_PROMPT = """Você é um assistente de comunicação profissional.
Gere um email em HTML bem formatado e humanizado para envio de currículo.
O email deve ser educado, profissional e direto ao ponto.
IDIOMA: Responda EM PORTUGUÊS (pt-BR).
Retorne um JSON com dois campos: subject (assunto do email) e body (HTML do corpo)."""


def extract_html_from_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        idx = text.find("\n")
        if idx != -1:
            text = text[idx:].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return text.strip()


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


def normalizar_resume_data(data: dict) -> dict:
    try:
        if "personal" not in data:
            personal = {}
            for chave in ("nome", "email", "telefone", "linkedin", "endereco", "resumo", "resumoProfissional"):
                if chave in data:
                    valor = data.pop(chave)
                    chave_destino = "resumo" if chave == "resumoProfissional" else chave
                    personal[chave_destino] = valor
            data["personal"] = personal

        if "experiencias" in data and "experiencia" not in data:
            data["experiencia"] = data.pop("experiencias")

        for exp in data.get("experiencia", []):
            if isinstance(exp.get("descricao"), str) and "realizacoes" not in exp:
                exp["realizacoes"] = [exp.pop("descricao")]

        if "educacao" not in data and "formacao" in data:
            data["educacao"] = data.pop("formacao")
        if "idiomas" not in data and "linguas" in data:
            data["idiomas"] = data.pop("linguas")
        if "certificacoes" not in data and "certificados" in data:
            data["certificacoes"] = data.pop("certificados")

        for campo in ("personal", "experiencia", "educacao", "habilidades", "idiomas", "certificacoes"):
            data.setdefault(campo, {} if campo == "personal" else [])
    except Exception as e:
        print(f"[normalizar_resume_data] ERRO: {e}")
    return data


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

ALLOWED_DOMAINS = ["firebasestorage.googleapis.com", "lh3.googleusercontent.com"]

def validate_url_domain(url: str):
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=400, detail=f"Domínio não permitido: {parsed.hostname}"
        )

def download_file(url: str) -> bytes:
    validate_url_scheme(url)
    validate_url_domain(url)
    try:
        import http.client
        parsed = urlparse(url)
        conn = http.client.HTTPSConnection(parsed.hostname, timeout=30)
        conn.request("GET", parsed.path + ("?" + parsed.query if parsed.query else ""))
        response = conn.getresponse()
        if response.status >= 400:
            raise HTTPException(status_code=502, detail="Erro ao baixar arquivo")
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
        raise HTTPException(status_code=502, detail="Erro ao baixar arquivo")

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

@app.get("/debug/firebase")
async def debug_firebase():
    raw_key = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY", "")
    import base64
    try:
        if raw_key.startswith("LS0t"):
            decoded = base64.b64decode(raw_key).decode("utf-8")
            final_key = decoded.replace("\\n", "\n").strip('"').strip("'")
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            try:
                key = serialization.load_pem_private_key(final_key.encode(), password=None)
                return {"key_valid": True, "key_type": type(key).__name__}
            except Exception as e:
                return {"key_valid": False, "decoding_error": str(e), "key_preview": final_key[:200] + "..."}
        else:
            return {"key_valid": False, "error": "key does not start with LS0t"}
    except Exception as e:
        return {"key_valid": False, "error": str(e), "trace": traceback.format_exc()[:500]}

@app.get("/debug/env")
async def debug_env():
    has_gemini = bool(os.environ.get("GEMINI_API_KEY"))
    has_groq = bool(os.environ.get("GROQ_API_KEY"))
    has_deepseek = bool(os.environ.get("DEEPSEEK_API_KEY"))
    has_client_email = bool(os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL"))
    has_private_key = bool(os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY"))
    has_project_id = bool(os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID"))
    raw_key = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY", "")
    return {
        "has_gemini": has_gemini,
        "has_groq": has_groq,
        "has_deepseek": has_deepseek,
        "has_client_email": has_client_email,
        "has_private_key": has_private_key,
        "has_project_id": has_project_id,
    "private_key_preview": raw_key[:80] if raw_key else "(empty)",
    "private_key_len": len(raw_key) if raw_key else 0,
    "private_key_is_base64": raw_key.startswith("LS0t"),
    "firebase_initialized": _firebase_initialized,
    "firebase_error": _firebase_init_error,
}


@app.post("/parse-resume")
async def parse_resume(req: ParseResumeRequest, uid: str = Depends(require_auth)):
    try:
        file_bytes = download_file(req.fileUrl)
        extracted_text = ocr_file(file_bytes)

        if not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Não foi possível extrair texto do arquivo.",
            )

        print(f"[parse-resume] extracted_text ({len(extracted_text)} chars)")

        prompt = f"""Você é um especialista em extração de dados de currículos.
O texto abaixo foi extraído via OCR (reconhecimento óptico de caracteres).
Corrija possíveis erros de OCR como acentos perdidos, caracteres trocados,
palavras grudadas ou cortadas em quebras de linha, e letras maiúsculas/minúsculas.

Extraia os dados estruturados em PORTUGUÊS e retorne EXATAMENTE este JSON aninhado:
{{
  "personal": {{"nome": "...", "email": "...", "telefone": "...", "linkedin": "...", "endereco": "...", "resumo": "..."}},
  "experiencia": [{{"empresa": "...", "cargo": "...", "periodo": "...", "realizacoes": ["..."]}}],
  "educacao": [{{"instituicao": "...", "grau": "...", "curso": "...", "periodo": "..."}}],
  "habilidades": ["PHP", "Python", "React", "JavaScript"],
  "idiomas": [{{"idioma": "...", "nivel": "..."}}],
  "certificacoes": [{{"nome": "...", "instituicao": "...", "ano": "..."}}]
}}

REGRAS IMPORTANTES:
- Extraia CADA habilidade (técnica ou comportamental) como UM item separado na lista "habilidades"
- Habilidades agrupadas em frases como "Conhecimento em Python, Java e SQL" devem virar ["Python", "Java", "SQL"]
- Os nomes dos campos DEVEM ficar EXATAMENTE como no JSON acima (em português)
- Se não encontrar nenhuma habilidade, retorne lista vazia []
- Preencha campos vazios com string vazia "" e listas vazias com []

Texto do currículo:
{extracted_text}

Retorne APENAS o JSON, sem formatação markdown."""

        response = await call_with_fallback(
            contents=[prompt],
        )

        print(f"[parse-resume] Resposta IA ({len(response.text)} chars)")

        data = extract_json_from_response(response.text)
        data = normalizar_resume_data(data)
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno ao processar currículo")


@app.get("/debug/gemini")
async def debug_gemini():
    if os.environ.get("DEBUG_MODE") != "true":
        raise HTTPException(status_code=404, detail="Not found")
    try:
        response = await call_with_fallback(
            contents=["Responda apenas: OK"],
        )
        return {"status": "ok", "text": response.text}
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


@app.post("/edit-resume")
async def edit_resume(req: EditResumeRequest, uid: str = Depends(require_auth)):
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
- NUNCA use primeira pessoa ("eu fiz", "minha experiência"). Escreva de forma impessoal: "Gestão de equipe…", "Desenvolvimento de…" em vez de "Eu gerenciei…"
- Retorne APENAS o HTML, sem formatação markdown"""

        response = await call_with_fallback(
            config=types.GenerateContentConfig(
                system_instruction=RESUME_SYSTEM_PROMPT,
            ),
            contents=[prompt],
        )

        return {"success": True, "html": extract_html_from_response(response.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno ao editar currículo")


@app.post("/ocr-job")
async def ocr_job(req: OcrJobRequest, uid: str = Depends(require_auth)):
    try:
        file_bytes = download_file(req.photoUrl)
        full_text = ocr_file(file_bytes)

        prompt = f"""O texto abaixo foi extraído via OCR (reconhecimento óptico de caracteres).
Corrija possíveis erros de OCR como acentos perdidos, caracteres trocados,
palavras grudadas ou cortadas.

Extraia e organize as informações desta descrição de vaga.
Retorne um JSON com: cargo, empresa (se disponível), descricao, requisitos (lista),
responsabilidades (lista), diferencial (lista), local, tipo (CLT/PJ/Remoto/etc).

Preencha campos vazios com string vazia "" e listas vazias com [].

Texto extraído:
{full_text}

Retorne APENAS o JSON, sem formatação markdown."""

        response = await call_with_fallback(
            contents=[prompt],
        )

        data = extract_json_from_response(response.text)
        return {"success": True, "data": data, "rawText": full_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno ao processar OCR")


@app.post("/generate-pdf")
async def generate_pdf(req: GeneratePdfRequest, uid: str = Depends(require_auth)):
    try:
        validate_generate_pdf_request(req)
        from weasyprint import HTML
        html_str = req.htmlContent
        if not html_str.strip().startswith("<"):
            margin_mm = req.pageMargins
            html_str = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@page {{ margin: {margin_mm}mm; }}
body {{ font-family: {req.fontFamily}, sans-serif; font-size: {req.fontSize}pt; color: #333; line-height: {req.lineHeight}; }}
h1, h2, h3 {{ color: {req.accentColor}; }}
h1 {{ font-size: {min(req.fontSize + 4, 20)}pt; }}
h2 {{ font-size: {min(req.fontSize + 2, 16)}pt; border-bottom: 2px solid {req.accentColor}; padding-bottom: 4px; }}
h3 {{ font-size: {req.fontSize + 1}pt; }}
</style></head><body>{html_str}</body></html>"""

        pdf_bytes = HTML(string=html_str).write_pdf()
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno ao gerar PDF")


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

        response = await call_with_fallback(
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
        raise HTTPException(status_code=500, detail="Erro interno ao gerar email")
