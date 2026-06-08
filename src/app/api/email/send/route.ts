import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { verifyAuth, validateBody } from '@/lib/api-helpers'
import { SendEmailApiSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const uidOrResponse = await verifyAuth(request)
    if (uidOrResponse instanceof NextResponse) return uidOrResponse

    const body = await request.json()
    const parsed = validateBody(SendEmailApiSchema, body)
    if (parsed instanceof NextResponse) return parsed

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: parsed.accessToken })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const utf8Subject = `=?UTF-8?B?${Buffer.from(parsed.subject).toString('base64')}?=`
    const to = parsed.to || 'me'
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      parsed.body,
    ]
    const raw = Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send email error:', err)
    return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 })
  }
}
