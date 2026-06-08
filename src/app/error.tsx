'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--color-background] p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[--color-destructive-bg] mx-auto">
          <span className="text-2xl text-[--color-destructive]">!</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-[--color-foreground]">Algo deu errado</h1>
        <p className="text-[--color-muted-foreground]">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-[--color-primary] px-6 py-2.5 text-sm font-medium text-[--color-primary-foreground] hover:opacity-90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
