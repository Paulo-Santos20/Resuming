'use client'

import { type ReactNode } from 'react'
import { ProcessingProvider } from '@/contexts/processing-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProcessingProvider>
      {children}
    </ProcessingProvider>
  )
}
