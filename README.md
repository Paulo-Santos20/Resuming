# Resuming

Cria currículos otimizados para cada vaga com IA.

**Live:** https://resuming-seven.vercel.app

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes (Vercel) + Python FastAPI (Google Cloud Run)
- **Auth:** Firebase Authentication (Google Provider)
- **Database:** Firestore
- **Storage:** Firebase Storage
- **AI:** Google Gemini (primário) → Groq Llama 3.3 70B (fallback gratuito)
- **OCR:** PaddleOCR (imagens) + PyMuPDF (PDFs com camada de texto)
- **PDF:** WeasyPrint (HTML → PDF)
- **Email:** Gmail API (via OAuth do próprio usuário)

## Pré-requisitos

- Node.js 20+
- Python 3.12+
- Conta Firebase (Auth + Firestore + Storage)
- Conta Google Cloud (Cloud Run)
- Chave Gemini AI (gratuita no Google AI Studio)

## Desenvolvimento local

```bash
# Frontend
npm install
cp .env.example .env.local
npm run dev

# Python service (em outro terminal)
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Variáveis de Ambiente

Veja `.env.example` para a lista completa.

## Python Service

### Arquitetura de fallback

O serviço tenta primeiro o Gemini (com rotação entre múltiplas chaves). Se todas esgotarem, cai para Groq (gratuito, via `llama-3.3-70b-versatile`).

### Deploy

O deploy automático via Cloud Build é ativado ao fazer push na branch `main`:

```bash
git push origin main
```

O arquivo `cloudbuild.yaml` na raiz do repositório coordena:
1. Build da imagem Docker em `python-service/`
2. Push para Artifact Registry
3. Deploy no Cloud Run

Para deploy manual:

```bash
bash python-service/deploy.sh
```

### Rotas da API

| Rota | Descrição |
|---|---|
| `POST /parse-resume` | Extrai dados estruturados de um currículo (OCR + IA) |
| `POST /edit-resume` | Adapta currículo para uma vaga específica |
| `POST /generate-pdf` | Gera PDF do currículo via WeasyPrint |
| `POST /generate-email` | Gera e-mail profissional de candidatura |
| `POST /ocr-job` | Extrai texto de descrição de vaga |

## Estrutura

```
src/
├── app/              # Páginas e API routes
│   ├── api/          # Rotas de API
│   ├── dashboard/    # Dashboard protegido
│   └── login/        # Login
├── components/       # Componentes React
│   ├── ui/           # shadcn-style
│   ├── auth/         # GoogleLoginButton
│   ├── email/        # EmailComposer
│   ├── job/          # JobCard, JobForm
│   ├── layout/       # Sidebar, DashboardShell
│   └── resume/       # Upload, Preview, VersionList
├── hooks/            # use-auth, use-resume, use-jobs
├── lib/              # Firebase, validações, utils
└── types/            # TypeScript interfaces

python-service/
├── main.py           # FastAPI (parse, edit, OCR, PDF, email)
├── Dockerfile        # Container para Cloud Run
├── cloudbuild.yaml   # CI/CD (raiz do projeto)
├── deploy.sh         # Deploy manual
└── requirements.txt  # Dependências Python
```

## Firebase Storage Rules

```bash
npx firebase deploy --only storage
```
