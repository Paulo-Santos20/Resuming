'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Sparkles } from 'lucide-react'
import type { JobDescription } from '@/types'

interface EmailComposerProps {
  job: JobDescription
  onSend: (subject: string, body: string) => Promise<void>
  onGenerateEmail: () => Promise<{ subject: string; body: string }>
  loading: boolean
  generating: boolean
}

export function EmailComposer({
  job,
  onSend,
  onGenerateEmail,
  loading,
  generating,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(
    `Candidatura — ${job.title}`
  )
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setError(null)
    try {
      const result = await onGenerateEmail()
      setSubject(result.subject)
      setBody(result.body)
    } catch (err) {
      setError('Erro ao gerar email com IA')
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await onSend(subject, body)
    } catch (err) {
      setError('Erro ao enviar email')
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Assunto</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            Gerar com IA
          </Button>
        </div>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Corpo do Email</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Clique em 'Gerar com IA' para criar um email humanizado ou escreva manualmente…"
          rows={14}
          required
          disabled={loading}
          className="font-body leading-relaxed"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading || !subject || !body}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Enviando…' : 'Enviar Email'}
        </Button>
      </div>
    </form>
  )
}
