'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro na aplicação:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-destructive-bg">
          <span className="text-2xl text-destructive">!</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Algo deu errado</h1>
        <p className="text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="rounded-lg border border-border bg-muted/50 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Detalhes do erro
            </summary>
            <p className="mt-2 text-xs text-muted-foreground font-mono break-all">
              {error.message}
              {error.digest && (
                <>
                  <br />
                  Digest: {error.digest}
                </>
              )}
            </p>
          </details>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
