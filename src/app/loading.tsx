export default function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-surface]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--color-brand] border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  )
}
