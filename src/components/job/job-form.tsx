'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Image, Upload, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobFormProps {
  onSubmit: (title: string, description: string, photoFile?: File) => Promise<string | undefined>
  loading: boolean
}

export function JobForm({ onSubmit, loading }: JobFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'text' | 'photo'>('text')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: loading || mode !== 'photo',
    onDrop: (accepted) => {
      if (accepted.length > 0) setPhotoFile(accepted[0])
    },
  })

  const [titleError, setTitleError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    try {
      const result = await onSubmit(title.trim(), description, photoFile || undefined)
      if (result) {
        setTitle('')
        setDescription('')
        setPhotoFile(null)
      }
    } catch {
      // Error toast is handled by the parent page
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">Título da Vaga</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
          placeholder="Ex: Engenheiro de Software Sênior"
          aria-invalid={titleError}
          aria-describedby={titleError ? 'title-error' : undefined}
          disabled={loading}
        />
        {titleError && (
          <p id="title-error" role="alert" className="text-xs text-destructive">
            O título da vaga é obrigatório
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={mode === 'text' ? 'descricao' : undefined}>Descrição da Vaga</Label>
          <div className="flex gap-1 rounded-lg border p-0.5" role="tablist" aria-label="Modo de entrada">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'text'}
              onClick={() => { setMode('text'); setPhotoFile(null) }}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                mode === 'text' ? 'bg-brand text-white' : 'text-muted-foreground'
              )}
            >
              Texto
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'photo'}
              onClick={() => setMode('photo')}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                mode === 'photo' ? 'bg-brand text-white' : 'text-muted-foreground'
              )}
            >
              Foto
            </button>
          </div>
        </div>

        {mode === 'text' ? (
          <Textarea
            id="descricao"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cole a descrição completa da vaga aqui…"
            rows={8}
            disabled={loading}
          />
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
              isDragActive ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            )}
          >
            <input {...getInputProps()} aria-label="Selecionar foto da vaga" />
            {photoFile ? (
              <div className="flex items-center gap-3">
                <Image className="h-5 w-5 text-brand" />
                <span className="text-sm">{photoFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover foto"
                  onClick={(e) => { e.stopPropagation(); setPhotoFile(null) }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Solte a imagem aqui' : 'Arraste uma foto da vaga'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique para selecionar (PNG, JPG, WebP)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {loading ? 'Processando…' : 'Adicionar Vaga'}
        </Button>
      </div>
    </form>
  )
}
