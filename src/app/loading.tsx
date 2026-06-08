export default function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" role="status" aria-label="Carregando" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  )
}
