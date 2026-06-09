# Corrigir 500 no parse-resume + schema mismatch + HTML nesting

## Problemas identificados

### 1. `POST /api/python/parse-resume 500`

No backend Python, `extract_json_from_response` ou `normalizar_resume_data` está lançando exceção em alguns casos. A normalização tenta `data.pop(chave)` para cada chave esperada — mesmo com `if chave in data`, pode haver KeyError se o Gemini retornar algo inesperado.

### 2. Gemini retorna `descricao` (string) em vez de `realizacoes` (array)

Cada item de `experiencia` vem com:
```json
{"empresa": "...", "cargo": "...", "periodo": "...", "descricao": "texto longo"}
```

O código espera `realizacoes: ["texto longo"]` (array). Isso faz `exp.realizacoes.map` quebrar no frontend.

### 3. HTML nesting warnings no CompletionModal

`DialogDescription` renderiza `<p>` que contém `<div>` — HTML inválido.

## Correções

### A. Python — tornar normalização robusta + tratar descricao

**`python-service/main.py` — `normalizar_resume_data`:**

```python
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

        # Normalizar cada experiencia: descricao (string) -> realizacoes (array)
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
```

### B. Frontend — safe access em `realizacoes`

**`src/components/resume/resume-preview-ats.tsx`:**

```tsx
{exp.realizacoes?.map((h, j) => (
  // ...
))}
```

Trocar `exp.realizacoes.map` por `(exp.realizacoes || []).map` ou optional chaining.

### C. Fix HTML nesting no CompletionModal

**`src/contexts/processing-context.tsx`:**

Linha 155: Trocar `<DialogDescription className="space-y-3 pt-2">` por `<div className="space-y-3 pt-2 text-sm text-muted-foreground">` (remover `<p>` wrapper).

Linha 161: Trocar `<p className="text-sm">` por `<span>`.
