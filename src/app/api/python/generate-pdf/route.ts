import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { sanitizeHtml } from '@/lib/sanitize'
import { GeneratePdfApiSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(GeneratePdfApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    let response: Response
    try {
      response = await fetch(`${PYTHON_SERVICE_URL}/generate-pdf`, {
        method: 'POST',
        headers: forwardAuth(request),
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({ htmlContent: sanitizeHtml(parsed.htmlContent) }),
      })
    } catch (fetchErr) {
      console.error('[generate-pdf] fetch failed:', fetchErr)
      return NextResponse.json(
        { error: 'Serviço de PDF indisponível. Verifique se o backend Python está rodando.' },
        { status: 503 }
      )
    }

    if (!response.ok) {
      const rawText = await response.text()
      let detail = rawText
      try {
        const parsed = JSON.parse(rawText)
        detail = parsed.detail || parsed.error || rawText
      } catch {}
      console.error('[generate-pdf] Python error:', response.status, detail)
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }

    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="curriculo.pdf"',
      },
    })
  } catch (err) {
    console.error('[generate-pdf] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
