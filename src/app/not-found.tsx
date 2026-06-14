'use client'

import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="glass-card mx-auto flex h-20 w-20 items-center justify-center rounded-2xl">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">Página não encontrada</h1>
        <p className="text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
