import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <LoadingSpinner size="lg" label="Carregando…" />
    </div>
  )
}
