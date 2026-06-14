'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useJobs } from '@/hooks/use-jobs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
const EmailComposer = dynamic(() => import('@/components/email/email-composer').then(m => m.EmailComposer), {
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-secondary" />,
})
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sanitizeHtml } from '@/lib/sanitize'
import { toastError } from '@/lib/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { usePageTitle } from '@/hooks/use-page-title'
import type { JobDescription } from '@/types'

export default function EmailVagaPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile, googleAccessToken, refreshGoogleToken } = useAuth()
  const { markAsSent } = useJobs(user?.uid)
  const router = useRouter()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  const [chosenType, setChosenType] = useState('ats')
  const [resumeHtml, setResumeHtml] = useState('')
  const [confirmData, setConfirmData] = useState<{ subject: string; body: string; to: string } | null>(null)

  useEffect(() => {
    setChosenType(sessionStorage.getItem(`chosen-${id}`) || 'ats')
    setResumeHtml(sessionStorage.getItem(`edited-${id}`) || '')
  }, [id])

  usePageTitle('Enviar E-mail')

  const handleSendWithConfirm = async (subject: string, body: string, to: string) => {
    setConfirmData({ subject, body, to })
  }

  const handleConfirmSend = () => {
    if (!confirmData) return
    handleSend(confirmData.subject, confirmData.body, confirmData.to)
    setConfirmData(null)
  }

  useEffect(() => {
    if (!user?.uid || !id) return
    const load = async () => {
      try {
        const snap = await getDoc(doc(getDbInstance(), 'users', user.uid, 'jobs', id))
        if (snap.exists()) {
          setJob({ id: snap.id, ...snap.data() } as JobDescription)
        }
      } catch (err) {
        console.error('Error loading job:', err)
      }
      setLoading(false)
    }
    load()
  }, [user?.uid, id])

  const handleGenerateEmail = async (): Promise<{ subject: string; body: string }> => {
    setGenerating(true)
    try {
      const idToken = await user?.getIdToken()
      const html = typeof window !== 'undefined'
        ? (sessionStorage.getItem(`edited-${id}`) || '<p>Currículo em anexo</p>')
        : '<p>Currículo em anexo</p>'

      const response = await fetch('/api/python/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          resumeHtml: html,
          jobTitle: job?.title || '',
          companyName: '',
        }),
      })
      if (!response.ok) throw new Error('Erro ao gerar email')
      const result = await response.json()
      return { subject: result.subject || `Candidatura — ${job?.title}`, body: result.body || '' }
    } catch (err) {
      console.error('Generate email error:', err)
      toastError('Erro ao gerar email', 'Tente novamente ou escreva manualmente')
      return { subject: `Candidatura — ${job?.title}`, body: '' }
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async (subject: string, body: string, to: string) => {
    if (!user?.uid || !job) return
    const recipient = to || profile?.email
    if (!recipient) {
      toastError('Destinatário não informado', 'Defina um email de destino antes de enviar')
      return
    }
    setSending(true)
    try {
      const token = googleAccessToken
      if (!token) {
        throw new Error('Token de acesso do Google não disponível')
      }
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          to: recipient,
          accessToken: token,
        }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Erro ao enviar email')
      }
      await markAsSent(job.id)
      router.push(`/dashboard/vagas/${id}`)
    } catch (err) {
      console.error('Send email error:', err)
      throw err
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando…</div>
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">Vaga não encontrada</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/vagas">Voltar</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar para vaga">
          <Link href={`/dashboard/vagas/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Enviar Email</h1>
          <p className="text-muted-foreground mt-1">
            Candidatura para {job.title}
          </p>
        </div>
      </div>

      {/* Google token warning */}
      {!googleAccessToken && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm">
          <span className="text-warning">
            Conexão com o Gmail expirou. Reconecte sua conta para enviar emails.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshGoogleToken}
            className="sm:ml-auto shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconectar Gmail
          </Button>
        </div>
      )}

      {/* Resume preview */}
      {resumeHtml && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Currículo Selecionado</CardTitle>
              <Badge variant={chosenType === 'original' ? 'secondary' : 'default'}>
                {chosenType === 'ats' ? 'ATS' : 'Original'}
              </Badge>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/vagas/${id}`}>
                Trocar versão
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none max-h-80 overflow-y-auto border rounded-lg p-6 bg-card"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(resumeHtml) }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compor Email</CardTitle>
        </CardHeader>
        <CardContent>
          {!googleAccessToken ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">Conecte sua conta Gmail para enviar emails.</p>
              <Button onClick={refreshGoogleToken}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Conectar Gmail
              </Button>
            </div>
          ) : (
            <>
              <EmailComposer
                job={job}
                onSend={handleSendWithConfirm}
                onGenerateEmail={handleGenerateEmail}
                loading={sending}
                generating={generating}
              />
              <ConfirmDialog
                open={!!confirmData}
                onOpenChange={(open) => { if (!open) setConfirmData(null) }}
                onConfirm={handleConfirmSend}
                title="Confirmar envio de email"
                description={
                  confirmData
                    ? `Enviar para ${confirmData.to} com assunto "${confirmData.subject}"?`
                    : 'Confirmar envio?'
                }
                confirmLabel="Enviar"
                variant="default"
                loading={sending}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
