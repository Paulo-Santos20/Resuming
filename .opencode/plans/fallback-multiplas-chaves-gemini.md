# Fallback de múltiplas chaves Gemini + troca de modelo

## 1. Trocar modelo de `gemini-flash-latest` para `gemini-2.5-flash`

**Arquivo:** `python-service/main.py` (2 ocorrências: `/parse-resume` e `/edit-resume`)

Substituir:
```python
model="gemini-flash-latest"
```
por:
```python
model="gemini-2.5-flash"
```

E na URL da API: a biblioteca `google.genai` já gerencia a versão da API internamente, só precisa do model name.

## 2. Fallback de múltiplas chaves API

### 2.1. Carregar chaves de uma variável de ambiente

No `.env.local`, adicionar chaves separadas por vírgula:
```
GEMINI_API_KEY=chave_primaria,chave_secundaria,chave_terciaria
```

### 2.2. Modificar `get_genai_client()` para aceitar lista

```python
def get_genai_client(key: Optional[str] = None):
    api_key = key or os.environ.get("GEMINI_API_KEY", "")
    # Se for string vazia, tentar Secret Manager
    if not api_key:
        try:
            from google.cloud import secretmanager
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{os.environ.get('GOOGLE_CLOUD_PROJECT')}/secrets/gemini-api-key/versions/latest"
            response = client.access_secret_version(request={"name": name})
            api_key = response.payload.data.decode("utf-8")
        except Exception:
            pass
    return genai.Client(api_key=api_key)
```

### 2.3. Modificar `call_gemini_with_retry` para rotacionar chaves

```python
def call_gemini_with_retry(client, model, contents=None, config=None, api_keys=None):
    import time
    last_error = None
    for attempt in range(3):
        try:
            if config:
                return client.models.generate_content(model=model, contents=contents, config=config)
            return client.models.generate_content(model=model, contents=contents)
        except Exception as e:
            last_error = e
            if _is_retryable_error(e):
                delay = 2 ** (attempt + 1)
                print(f"    [retry] Gemini falhou (tentativa {attempt + 1}/3), tentando novamente em {delay}s: {e}")
                time.sleep(delay)
            else:
                raise

def call_gemini_with_key_rotation(keys, model, contents=None, config=None):
    for i, key in enumerate(keys):
        try:
            client = get_genai_client(key)
            return call_gemini_with_retry(client, model, contents, config)
        except Exception as e:
            is_quota = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            if is_quota and i < len(keys) - 1:
                print(f"    [key rotation] Chave {i+1} quota exaurida, tentando próxima...")
                continue
            raise
```

### 2.4. Usar nos endpoints

No `/parse-resume` e `/edit-resume`:

```python
keys = [k.strip() for k in os.environ.get("GEMINI_API_KEY", "").split(",") if k.strip()]
response = call_gemini_with_key_rotation(
    keys,
    model="gemini-2.5-flash",
    contents=[prompt],
)
```

## 3. Fluxo completo

```
Requisição → tenta chave 1
  ├─ 200 → retorna resultado ✅
  ├─ 429 → loga "chave 1 exaurida", tenta chave 2
  │   ├─ 200 → retorna resultado ✅
  │   └─ 429 → tenta chave 3...
  └─ outro erro → loga e propaga exceção
```

## 4. Como o usuário adiciona chaves

Editar `.env.local`:
```
GEMINI_API_KEY=AIza...primeira,AIza...segunda,AIza...terceira
```

## Arquivos para modificar

- `python-service/main.py` — modelo + fallback
- `.env.local` — adicionar chaves separadas por vírgula (manual)
