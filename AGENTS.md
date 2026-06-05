<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resume React — Project Context

## Stack
- **Runtime:** Next.js 16 (App Router), React 19, Turbopack
- **CSS:** Tailwind CSS v4 (config via CSS `@theme`, NOT `tailwind.config.ts` — file was deleted)
- **State:** Zustand + TanStack React Query
- **Validation:** Zod v4 (note: `z.literal()` no longer accepts `errorMap` — use `.refine()`)
- **Auth:** Firebase (`'use client'` only, lazy getters: `getAuthInstance()`, `getDbInstance()`, `getStorageInstance()`)
- **Backend:** Python FastAPI on Cloud Run (PaddleOCR + Gemini + WeasyPrint)
- **Key deps:** `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `firebase-admin`, `googleapis`

## API Contracts (Next.js ↔ Python)
- `POST /api/python/parse-resume` → Python `{ fileUrl, uid }` → `{ success, data }`
- `POST /api/python/edit-resume` → Python `{ resumeData, jobDescription, templateType }` → `{ success, html }`
- `POST /api/python/ocr-job` → Python `{ photoUrl }` → `{ success, data, rawText }`
- `POST /api/python/generate-pdf` → Python `{ htmlContent }` → binary PDF
- `POST /api/python/generate-email` → Python `{ resumeHtml, jobTitle, companyName }` → `{ success, subject, body }`
- `POST /api/email/send` → forwarded as Bearer token, sends via Gmail API

## Firebase pattern (lazy, never at module level)
```typescript
import { getAuthInstance, getDbInstance, getStorageInstance, getGoogleProvider } from '@/lib/firebase'
const db = getDbInstance()
```

## Key rules
- All Firebase client code must be in `'use client'` components
- Firebase initialized via lazy getters only — no module-level `getAuth()` calls
- Middleware at root level handles CSP headers (see `middleware.ts`)
- Tailwind v4 uses `@import "tailwindcss"` in `globals.css`, all config in `@theme` block
