'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
  titleId: string
}

const DialogContext = React.createContext<DialogContextType | null>(null)

function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('Dialog components must be used within <Dialog>')
  return ctx
}

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const titleId = React.useId()
  const setOpen = React.useCallback(
    (val: boolean) => {
      if (isControlled) onOpenChange?.(val)
      else setUncontrolledOpen(val)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open, onOpenChange: setOpen, titleId }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useDialog()
  return (
    <button
      ref={ref}
      className={cn(className)}
      onClick={(e) => {
        onOpenChange(true)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DialogTrigger.displayName = 'DialogTrigger'

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showClose?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showClose = true, ...props }, ref) => {
    const { open, onOpenChange, titleId } = useDialog()
    const panelRef = React.useRef<HTMLDivElement>(null)
    const previousActiveElement = React.useRef<HTMLElement | null>(null)

    React.useEffect(() => {
      if (!open) return

      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'

      const panel = panelRef.current
      panel?.focus()

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') return onOpenChange(false)
        if (e.key !== 'Tab' || !panel) return

        const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
      document.addEventListener('keydown', handleKey)

      return () => {
        document.removeEventListener('keydown', handleKey)
        document.body.style.overflow = ''
        previousActiveElement.current?.focus()
      }
    }, [open, onOpenChange])

    if (typeof document === 'undefined') return null
    if (!open) return null

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            'fixed z-50 w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-lg outline-none',
            className
          )}
          {...props}
        >
          {showClose && (
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {children}
        </div>
      </div>,
      document.body
    )
  }
)
DialogContent.displayName = 'DialogContent'

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6', className)}
      {...props}
    />
  )
}

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { titleId } = useDialog()
  return (
    <h2
      id={titleId}
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
      {...props}
    />
  )
})
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useDialog()
  return (
    <button
      ref={ref}
      className={cn(className)}
      onClick={(e) => {
        onOpenChange(false)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DialogClose.displayName = 'DialogClose'

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
