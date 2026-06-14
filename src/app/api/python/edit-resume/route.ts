import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { sanitizeHtml } from '@/lib/sanitize'
import { EditResumeApiSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(EditResumeApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    console.log('[edit-resume] calling Python service at', PYTHON_SERVICE_URL)

    let response: Response
    try {
      response = await fetch(`${PYTHON_SERVICE_URL}/edit-resume`, {
        method: 'POST',
        headers: forwardAuth(request),
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          resumeData: parsed.resumeData,
          jobDescription: sanitizeHtml(parsed.jobDescription),
          templateType: parsed.templateType,
          instructions: parsed.instructions,
        }),
      })
    } catch (fetchErr) {
      console.error('[edit-resume] fetch failed:', fetchErr)
      return NextResponse.json(
        { error: 'Serviço de edição indisponível. Verifique se o backend Python está rodando.' },
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
      console.error('[edit-resume] Python returned error:', response.status, detail)
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }

    const data = await response.json()
    console.log('[edit-resume] Python success, html length:', data.html?.length || 0)
    if (data.html) {
      data.html = sanitizeHtml(data.html)
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[edit-resume] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
