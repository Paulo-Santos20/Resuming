# Diagnosticar 500 no /parse-resume

## Problema
Todas as 10 tentativas do `processInBackground` retornam `500` no endpoint `/api/python/parse-resume`. O serviço Python está rodando (health check OK), mas o endpoint está crashando consistentemente.

## Causas possíveis

1. **Gemini API key inválida ou não encontrada** — `get_genai_client()` falha sempre
2. **Modelo `gemini-flash-latest` não resolve** — nome do modelo mudou ou expirou
3. **OCR (`ocr_file`) falha silenciosamente** — PaddleOCR ou PyMuPDF com erro
4. **texto extraído vazio** — mas o 500 vem antes do 422

## Diagnóstico

### Passo 1 — Adicionar log do erro real no `except`

**`python-service/main.py`** (linha ~357):

```python
except Exception as e:
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=str(e))
```

Isso vai printar o traceback completo nos logs do Python.

### Passo 2 — Criar endpoint de diagnóstico

Adicionar ao `main.py`:

```python
@app.get("/debug/gemini")
async def debug_gemini():
    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=["Responda apenas: OK"]
        )
        return {"status": "ok", "text": response.text}
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

### Passo 3 — Testar

Depois de aplicar:
```bash
curl http://localhost:8000/debug/gemini
```

Se retornar `{"status":"error"}`, o problema é na API Gemini (key, modelo, quota).

Se retornar `{"status":"ok"}`, o problema é específico do parse-resume (OCR, prompt, extracted_text).

### Passo 4 — Mostrar erro real no frontend

**`src/hooks/use-resume.ts`**: no `processInBackground`, quando `response.ok` é false, logar o `detail` completo.

---

## Execução

1. Aplicar Passo 1 (traceback no except)
2. Aplicar Passo 2 (endpoint /debug/gemini)
3. Fazer upload do PDF de novo
4. Ver logs do Python (`pm2 logs` ou stdout)
5. Se o erro não aparecer nos logs, testar `/debug/gemini` manualmente

## Possíveis resultados

| Log do traceback | Causa | Solução |
|---|---|---|
| `get_genai_client` → erro de API key | GEMINI_API_KEY não setada | Configurar variável |
| `call_gemini_with_retry` → 429/500 | Quota excedida | Esperar ou trocar chave |
| `ModelNotFound` → `gemini-flash-latest` | Modelo não existe | Trocar para `gemini-2.0-flash` |
| `ocr_file` → erro import | PaddleOCR/PyMuPDF não instalado | Reinstalar dependências |
| `extract_json_from_response` → JSONDecodeError | Gemini retornou resposta inválida | Reforçar prompt ou adicionar fallback |
