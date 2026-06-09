import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 30
const rateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key)
  }
}, 60_000)

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "img-src 'self' data: https: blob:",
  "font-src 'self' https://api.fontshare.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebasestorage.googleapis.com https://*.firestore.googleapis.com wss://*.firebaseio.com",
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/') && isRateLimited(request)) {
    return new NextResponse('Muitas requisições. Tente novamente em instantes.', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  response.headers.set('Content-Security-Policy', CSP_HEADER)
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return response
}

export const config = {
  matcher: '/((?!_next/static|_next/image|_next/data|favicon.ico).*)',
}
