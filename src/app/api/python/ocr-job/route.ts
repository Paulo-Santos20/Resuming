import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { OcrJobApiSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(OcrJobApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    let response: Response
    try {
      response = await fetch(`${PYTHON_SERVICE_URL}/ocr-job`, {
        method: 'POST',
        headers: forwardAuth(request),
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify(parsed),
      })
    } catch (fetchErr) {
      console.error('[ocr-job] fetch failed:', fetchErr)
      return NextResponse.json(
        { error: 'Serviço de OCR indisponível. Verifique se o backend Python está rodando.' },
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
      console.error('[ocr-job] Python error:', response.status, detail)
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[ocr-job] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
