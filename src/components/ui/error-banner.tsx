import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({ message, onDismiss, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-destructive-bg border border-destructive-border p-3 text-sm text-destructive-text flex items-start gap-2',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-destructive-text/70 hover:text-destructive-text transition-colors shrink-0 ml-2"
          aria-label="Fechar"
        >
          &times;
        </button>
      )}
    </div>
  )
}
