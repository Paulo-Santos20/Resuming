import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, validateBody, PYTHON_SERVICE_URL } from '@/lib/api-helpers'
import { sanitizeHtml } from '@/lib/sanitize'
import { GenerateEmailApiSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(GenerateEmailApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    const response = await fetch(`${PYTHON_SERVICE_URL}/generate-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeHtml: sanitizeHtml(parsed.resumeHtml),
        jobTitle: parsed.jobTitle,
        companyName: parsed.companyName,
        hiringManager: parsed.hiringManager,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Generate email error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
