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

    const response = await fetch(`${PYTHON_SERVICE_URL}/edit-resume`, {
      method: 'POST',
      headers: forwardAuth(request),
      body: JSON.stringify({
        resumeData: parsed.resumeData,
        jobDescription: sanitizeHtml(parsed.jobDescription),
        templateType: parsed.templateType,
        instructions: parsed.instructions,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()
    if (data.html) {
      data.html = sanitizeHtml(data.html)
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('Edit resume error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
