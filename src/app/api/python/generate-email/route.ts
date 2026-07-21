import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { sanitizeHtml } from '@/lib/sanitize'
import { GenerateEmailApiSchema } from '@/lib/validations'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const MAX_RETRIES = 3

export async function POST(request: NextRequest) {
  console.log('[generate-email] handler invoked, PYTHON_SERVICE_URL:', PYTHON_SERVICE_URL)
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) {
      console.error('[generate-email] auth failed')
      return uidOrResponse
    }

    const body = await request.json()
    const parsed = validateBody(GenerateEmailApiSchema, body)
    if (parsed instanceof NextResponse) {
      console.error('[generate-email] validation failed:', JSON.stringify(body).slice(0, 200))
      return parsed
    }

    console.log('[generate-email] sanitizing resumeHtml length:', parsed.resumeHtml?.length)
    const cleaned = sanitizeHtml(parsed.resumeHtml)
    console.log('[generate-email] sanitized length:', cleaned.length)

    const bodyPayload = JSON.stringify({
      resumeHtml: cleaned,
      jobTitle: parsed.jobTitle,
      companyName: parsed.companyName,
      hiringManager: parsed.hiringManager,
    })

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let response: Response
      try {
        console.log(`[generate-email] fetching (attempt ${attempt + 1})`, `${PYTHON_SERVICE_URL}/generate-email`)
        response = await fetch(`${PYTHON_SERVICE_URL}/generate-email`, {
          method: 'POST',
          headers: forwardAuth(request),
          signal: AbortSignal.timeout(60000),
          body: bodyPayload,
        })
      } catch (fetchErr) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`[generate-email] fetch failed (attempt ${attempt + 1}), retry in ${delay}ms:`, fetchErr)
          await sleep(delay)
          continue
        }
        console.error('[generate-email] fetch failed after all retries:', fetchErr)
        return NextResponse.json(
          { error: 'Serviço de e-mail indisponível. Verifique se o backend Python está rodando.' },
          { status: 503 }
        )
      }

      if (response.ok) {
        const data = await response.json()
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
        console.log(`[generate-email] rate limited (attempt ${attempt + 1}), retry in ${delay}ms`)
        await sleep(delay)
        continue
      }

      console.error('[generate-email] Python error:', response.status, detail)
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }
  } catch (err) {
    console.error('[generate-email] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
