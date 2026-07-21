import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { sanitizeHtml } from '@/lib/sanitize'
import { EditResumeApiSchema } from '@/lib/validations'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const MAX_RETRIES = 3

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(EditResumeApiSchema, body)
    if (parsed instanceof NextResponse) {
      const errBody = await parsed.clone().json()
      console.error('[edit-resume] validation error:', JSON.stringify(errBody))
      return parsed
    }

    const jobDesc = sanitizeHtml(parsed.jobDescription || '')
    if (!jobDesc) {
      console.warn('[edit-resume] jobDescription vazia, usando fallback')
    }

    const bodyPayload = JSON.stringify({
      resumeData: parsed.resumeData,
      jobDescription: jobDesc || 'Gere um currículo padronizado sem descrição de vaga específica',
      templateType: parsed.templateType,
      instructions: parsed.instructions,
    })

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let response: Response
      try {
        response = await fetch(`${PYTHON_SERVICE_URL}/edit-resume`, {
          method: 'POST',
          headers: forwardAuth(request),
          signal: AbortSignal.timeout(60000),
          body: bodyPayload,
        })
      } catch (fetchErr) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`[edit-resume] fetch failed (attempt ${attempt + 1}), retry in ${delay}ms:`, fetchErr)
          await sleep(delay)
          continue
        }
        console.error('[edit-resume] fetch failed after all retries:', fetchErr)
        return NextResponse.json(
          { error: 'Serviço de edição indisponível. Verifique se o backend Python está rodando.' },
          { status: 503 }
        )
      }

      if (response.ok) {
        const data = await response.json()
        if (data.html) {
          data.html = sanitizeHtml(data.html)
        }
        return NextResponse.json(data)
      }

      const rawText = await response.text()
      let detail: string
      try {
        const parsed = JSON.parse(rawText)
        detail = parsed.detail || parsed.error || rawText
      } catch {
        detail = rawText
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000
        console.log(`[edit-resume] rate limited (attempt ${attempt + 1}), retry in ${delay}ms`)
        await sleep(delay)
        continue
      }

      console.error('[edit-resume] Python returned error:', response.status, detail)
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }
  } catch (err) {
    console.error('[edit-resume] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
