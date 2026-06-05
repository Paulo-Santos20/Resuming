'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmailComposer } from '@/components/email/email-composer'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { JobDescription, ResumeVersion } from '@/types'

export default function EmailVagaPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile, googleAccessToken } = useAuth()
  const router = useRouter()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

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
      const response = await fetch('/api/python/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          resumeHtml: '<p>Currículo em anexo</p>',
          jobTitle: job?.title || '',
          companyName: '',
        }),
      })
      if (!response.ok) throw new Error('Erro ao gerar email')
      const result = await response.json()
      return { subject: result.subject || `Candidatura — ${job?.title}`, body: result.body || '' }
    } catch (err) {
      console.error('Generate email error:', err)
      return { subject: `Candidatura — ${job?.title}`, body: '' }
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async (subject: string, body: string) => {
    if (!user?.uid || !job) return
    setSending(true)
    try {
      if (!googleAccessToken) {
        throw new Error('Token de acesso do Google não disponível — faça login novamente')
      }
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          to: profile?.email,
          accessToken: googleAccessToken,
        }),
      })
      if (!response.ok) throw new Error('Erro ao enviar email')
      router.push(`/dashboard/vagas/${id}`)
    } catch (err) {
      console.error('Send email error:', err)
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
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
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

      <Card>
        <CardHeader>
          <CardTitle>Compor Email</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailComposer
            job={job}
            onSend={handleSend}
            onGenerateEmail={handleGenerateEmail}
            loading={sending}
            generating={generating}
          />
        </CardContent>
      </Card>
    </div>
  )
}
