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
  onSend: (subject: string, body: string, to: string) => Promise<void>
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
  const [recipientEmail, setRecipientEmail] = useState('')
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
    } catch {
      setError('Erro ao gerar email com IA')
    }
  }

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return 'Informe o email do destinatário'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) return 'Informe um email válido'
    return null
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateEmail(recipientEmail)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    try {
      await onSend(subject, body, recipientEmail)
    } catch {
      setError('Erro ao enviar email')
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive-bg border border-destructive-border p-3 text-sm text-destructive-text" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="recipient">Destinatário</Label>
        <Input
          id="recipient"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="email@recrutador.com"
          disabled={loading}
        />
      </div>

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
          rows={8}
          required
          disabled={loading}
          className="font-body leading-relaxed resize-y"
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
