# Diagnosticar "0 habilidades detectadas"

## Problema
Upload de "Paulo Cardoso - Desenvolvedor.pdf" → toast "Paulo Cardoso — 0 habilidades detectadas".

## Diagnóstico (CONCLUÍDO)

Logs do frontend revelaram a causa raiz:

**Gemini retornou JSON com chaves em português:**
```json
{
  "nome": "PAULO DOS SANTOS DE OLIVEIRA CARDOSO",
  "habilidades": ["JavaScript/TypeScript", "Python", ...]
}
```

O código espera:
```typescript
data.personal.name  // → undefined (não existe "personal")
data.skills          // → undefined (não existe "skills", é "habilidades")
```

O Gemini ignorou a instrução "EXATAMENTE este JSON aninhado" e traduziu as chaves para português, além de achatar a estrutura (tudo no nível superior em vez de `personal.name`).

## Correção necessária

**Arquivo:** `python-service/main.py` (~linha 286)

Reforçar no prompt que os nomes dos campos DEVEM permanecer em inglês:

```
ATENÇÃO: os nomes dos campos DEVEM ficar em INGLÊS, NÃO traduza para português.
Use EXATAMENTE: personal, name, email, phone, linkedin, location, summary,
experience, company, role, period, highlights, education, institution, degree, field,
skills, languages, language, level, certifications, issuer, year.

O campo "personal" deve conter TODOS os dados pessoais aninhados.
```

Inserir estas linhas ANTES do JSON schema, depois de "Extraia os dados estruturados e retorne EXATAMENTE este JSON aninhado:".
