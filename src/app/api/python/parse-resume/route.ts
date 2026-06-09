import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL, forwardAuth } from '@/lib/api-helpers'
import { ParseResumeApiSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(ParseResumeApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    let response: Response
    try {
      response = await fetch(`${PYTHON_SERVICE_URL}/parse-resume`, {
        method: 'POST',
        headers: forwardAuth(request),
        body: JSON.stringify({ fileUrl: parsed.fileUrl, uid: uidOrResponse }),
        signal: AbortSignal.timeout(60000),
      })
    } catch {
      return NextResponse.json(
        { error: 'Serviço de processamento indisponível. Verifique se o backend Python está rodando.' },
        { status: 503 }
      )
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const detail = body.detail || body.error || await response.text().catch(() => 'Erro desconhecido')
      return NextResponse.json({ error: detail, detail }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Parse resume error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
