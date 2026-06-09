# Resuming

Aplicação web para criar currículos otimizados para cada vaga com IA.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes (Vercel) + Python FastAPI (Google Cloud Run)
- **Auth:** Firebase Authentication (Google Provider)
- **Database:** Firestore
- **Storage:** Firebase Storage
- **AI:** Google Gemini (via google-genai SDK com retry automático)
- **OCR:** PaddleOCR PP-StructureV3
- **PDF:** WeasyPrint (HTML → PDF)
- **Email:** Gmail API

## Pré-requisitos

- Node.js 20+
- Python 3.12+
- Conta Firebase (Auth + Firestore + Storage)
- Conta Google Cloud (Cloud Run, Secret Manager)
- API Key Gemini

## Setup

```bash
# Instalar dependências
npm install

# Copiar env e preencher
cp .env.example .env.local

# Desenvolvimento
npm run dev
```

## Variáveis de Ambiente

Veja `.env.example` para todas as variáveis necessárias.

## Python Service

### Local
```bash
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Deploy (Cloud Run)
```bash
bash python-service/deploy.sh
```

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
├── deploy.sh         # Deploy script
└── requirements.txt  # Python dependencies
```

## Firebase Storage Rules

O arquivo `storage.rules` na raiz deve ser deployado para o Firebase:

```bash
npx firebase deploy --only storage
```
