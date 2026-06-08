import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { initAdmin } from '@/lib/firebase-admin'
import { z } from 'zod'

export async function verifyAuth(request: NextRequest): Promise<string | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) as NextResponse
  }

  const token = authHeader.split('Bearer ')[1]
  initAdmin()
  try {
    const decoded = await getAuth().verifyIdToken(token)
    return decoded.uid
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 }) as NextResponse
  }
}

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T | NextResponse {
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
      { status: 400 }
    ) as NextResponse
  }
  return result.data
}

export const PYTHON_SERVICE_URL = process.env.CLOUD_RUN_URL || 'http://localhost:8000'
