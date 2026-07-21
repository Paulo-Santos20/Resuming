'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, FileText } from 'lucide-react'

export interface ProcessingItem {
  fileName: string
  progress: number
  status: 'processing' | 'completed' | 'error'
  name?: string
  skillsCount?: number
  error?: string
}

export interface ProcessingContextValue {
  items: Record<string, ProcessingItem>
  register: (id: string, fileName: string) => void
  updateProgress: (id: string, progress: number) => void
  complete: (id: string, name: string, skillsCount: number) => void
  fail: (id: string, error: string) => void
  remove: (id: string) => void
  dismissModal: () => void
  lastCompleted: (ProcessingItem & { id: string }) | null
}

const ProcessingContext = createContext<ProcessingContextValue>({
  items: {},
  register: () => {},
  updateProgress: () => {},
  complete: () => {},
  fail: () => {},
  remove: () => {},
  dismissModal: () => {},
  lastCompleted: null,
})

export function useProcessing() {
  return useContext(ProcessingContext)
}

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, ProcessingItem>>({})
  const [lastCompleted, setLastCompleted] = useState<(ProcessingItem & { id: string }) | null>(null)
  const itemsRef = useRef<Record<string, ProcessingItem>>({})
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const register = useCallback((id: string, fileName: string) => {
    const item: ProcessingItem = { fileName, progress: 20, status: 'processing' }
    itemsRef.current[id] = item
    setItems({ ...itemsRef.current })
  }, [])

  const updateProgress = useCallback((id: string, progress: number) => {
    const item = itemsRef.current[id]
    if (!item || item.status !== 'processing') return
    itemsRef.current[id] = { ...item, progress }
    setItems({ ...itemsRef.current })
  }, [])

  const complete = useCallback((id: string, name: string, skillsCount: number) => {
    const item = itemsRef.current[id]
    if (!item) return
    const completed: ProcessingItem = { ...item, progress: 100, status: 'completed', name, skillsCount }
    itemsRef.current[id] = completed
    setItems({ ...itemsRef.current })
    setLastCompleted({ id, ...completed })

    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => {
      delete itemsRef.current[id]
      setItems({ ...itemsRef.current })
      delete timersRef.current[id]
    }, 6000)
  }, [])

  const fail = useCallback((id: string, error: string) => {
    const item = itemsRef.current[id]
    if (!item) return
    itemsRef.current[id] = { ...item, status: 'error', error, progress: item.progress }
    setItems({ ...itemsRef.current })

    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => {
      delete itemsRef.current[id]
      setItems({ ...itemsRef.current })
      delete timersRef.current[id]
    }, 10000)
  }, [])

  const remove = useCallback((id: string) => {
    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    delete itemsRef.current[id]
    setItems({ ...itemsRef.current })
  }, [])

  const dismissModal = useCallback(() => setLastCompleted(null), [])

  const value = useMemo(() => ({
    items, register, updateProgress, complete, fail, remove, dismissModal, lastCompleted,
  }), [items, lastCompleted, register, updateProgress, complete, fail, remove, dismissModal])

  return (
    <ProcessingContext.Provider value={value}>
      {children}
      <FloatingProgressBar items={items} />
      <CompletionModal item={lastCompleted} onDismiss={dismissModal} />
    </ProcessingContext.Provider>
  )
}

function FloatingProgressBar({ items }: { items: Record<string, ProcessingItem> }) {
  const activeItems = Object.entries(items).filter(([, v]) => v.status === 'processing')
  if (activeItems.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-[calc(100vw-2rem)] sm:w-72">
      {activeItems.map(([id, item]) => (
        <div key={id} className="rounded-lg border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand shrink-0" />
            <span className="text-sm font-medium truncate">{item.fileName}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-1000 ease-out"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Processando… {Math.round(item.progress)}%
          </p>
        </div>
      ))}
    </div>
  )
}

function CompletionModal({
  item,
  onDismiss,
}: {
  item: (ProcessingItem & { id: string }) | null
  onDismiss: () => void
}) {
  if (!item) return null

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onDismiss() }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <DialogTitle>Currículo Processado</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3 pt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">{item.fileName}</span>
          </div>
          {item.name && (
            <span className="block">
              {item.name}
              {item.skillsCount != null && <span> — {item.skillsCount} habilidades detectadas</span>}
            </span>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onDismiss}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
