'use client'

import { type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { ProcessingProvider } from '@/contexts/processing-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProcessingProvider>
        {children}
      </ProcessingProvider>
    </AuthProvider>
  )
}
