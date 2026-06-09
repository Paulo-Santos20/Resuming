'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResumeUploadProps {
  onUpload: (file: File) => Promise<string | undefined>
  loading: boolean
}

export function ResumeUpload({ onUpload, loading }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setFile(accepted[0])
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: loading,
  })

  const handleUpload = async () => {
    if (!file) return
    setError(null)
    try {
      await onUpload(file)
      setFile(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar currículo'
      setError(msg)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive-bg border border-destructive-border p-3 text-sm text-destructive-text" role="alert">
          {error}
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer',
          isDragActive
            ? 'border-brand bg-brand/5'
            : 'border-border hover:border-brand/50 hover:bg-secondary/50'
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <>
            <Upload className="h-10 w-10 text-brand mb-4" />
            <p className="font-medium text-brand">Solte o PDF aqui</p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-brand/10 p-4 mb-4">
              <File className="h-8 w-8 text-brand" />
            </div>
            <p className="font-medium">Toque para selecionar ou arraste o PDF aqui</p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para selecionar (PDF, máximo 10MB)
            </p>
          </>
        )}
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <File className="h-5 w-5 text-brand shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              disabled={loading}
              aria-label="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleUpload} disabled={loading} size="sm">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {loading ? 'Processando…' : 'Enviar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
