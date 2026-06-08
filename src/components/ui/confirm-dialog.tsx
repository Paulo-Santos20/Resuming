'use client'

import * as React from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel?: () => void
  loading?: boolean
  hideCancel?: boolean
  children?: React.ReactNode
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
  hideCancel = false,
  children,
}: ConfirmDialogProps) {
  const handleCancel = React.useCallback(() => {
    onCancel?.()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          {!hideCancel && (
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {cancelLabel}
            </Button>
          )}
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Carregando\u2026' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ConfirmDialog }
export type { ConfirmDialogProps }
