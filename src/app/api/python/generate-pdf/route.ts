import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { sanitizeHtml } from '@/lib/sanitize'
import { GeneratePdfApiSchema } from '@/lib/validations'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const MAX_RETRIES = 3

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(GeneratePdfApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    const bodyPayload = JSON.stringify({ htmlContent: sanitizeHtml(parsed.htmlContent) })

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let response: Response
      try {
        response = await fetch(`${PYTHON_SERVICE_URL}/generate-pdf`, {
          method: 'POST',
          headers: forwardAuth(request),
          signal: AbortSignal.timeout(120000),
          body: bodyPayload,
        })
      } catch (fetchErr) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`[generate-pdf] fetch failed (attempt ${attempt + 1}), retry in ${delay}ms:`, fetchErr)
          await sleep(delay)
          continue
        }
        console.error('[generate-pdf] fetch failed after all retries:', fetchErr)
        return NextResponse.json(
          { error: 'Serviço de PDF indisponível. Verifique se o backend Python está rodando.' },
          { status: 503 }
        )
      }

      if (response.ok) {
        const buffer = await response.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="curriculo.pdf"',
          },
        })
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
        console.log(`[generate-pdf] rate limited (attempt ${attempt + 1}), retry in ${delay}ms`)
        await sleep(delay)
        continue
      }

      console.error('[generate-pdf] Python error:', response.status, detail)
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }
  } catch (err) {
    console.error('[generate-pdf] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
