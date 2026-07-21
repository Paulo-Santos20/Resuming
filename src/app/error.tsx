'use client'

export default function ErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-destructive-bg mx-auto">
          <span className="text-2xl text-destructive">!</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Algo deu errado</h1>
        <p className="text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
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
