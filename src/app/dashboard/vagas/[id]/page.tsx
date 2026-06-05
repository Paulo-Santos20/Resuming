'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useResume } from '@/hooks/use-resume'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Edit3, Send, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { JobDescription } from '@/types'

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
}

export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { resumes, loading: resumeLoading, editResume } = useResume(user?.uid)
  const [job, setJob] = useState<JobDescription | null>(null)
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid || !id) return
    const loadJob = async () => {
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
    loadJob()
  }, [user?.uid, id])

  const handleEditResume = useCallback(async () => {
    if (!resumes[0] || !job) return
    setEditing(true)
    try {
      const content = await editResume(
        resumes[0].id,
        job.id,
        job.description,
        'ats'
      )
      setEditedContent(content)
      sessionStorage.setItem(`edited-${job.id}`, content)
    } catch (err) {
      console.error('Edit resume error:', err)
    } finally {
      setEditing(false)
    }
  }, [resumes, job, editResume])

  useEffect(() => {
    if (job) {
      const cached = sessionStorage.getItem(`edited-${job.id}`)
      if (cached) setEditedContent(cached)
    }
  }, [job])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
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

  const statusVariant = job.status === 'sent' ? 'success' as const : job.status === 'edited' ? 'warning' as const : 'secondary' as const

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/vagas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{job.title}</h1>
              <Badge variant={statusVariant}>
                {job.status === 'sent' ? 'Enviado' : job.status === 'edited' ? 'Editado' : 'Pendente'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Fonte: {job.source === 'text' ? 'Texto' : 'Foto'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.status !== 'sent' && (
            <>
              <Button
                variant="default"
                onClick={handleEditResume}
                disabled={editing || resumes.length === 0}
              >
                {editing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Editar para esta Vaga
              </Button>
              <Button variant="accent" asChild>
                <Link href={`/dashboard/vagas/${job.id}/email`}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Descrição da Vaga</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
              {job.description}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Currículo Editado</CardTitle>
            {editedContent && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/vagas/${job.id}/editar`}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/vagas/${job.id}/email`}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Link>
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editedContent ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editedContent) }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Clique em &ldquo;Editar para esta Vaga&rdquo;</p>
                <p className="text-sm mt-1">
                  para gerar uma versão otimizada do currículo
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
