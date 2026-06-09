'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useResume } from '@/hooks/use-resume'
import { useJobs } from '@/hooks/use-jobs'
import { useProcessing } from '@/contexts/processing-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Edit3, Send, Sparkles, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
import { toastError, toastSuccess } from '@/lib/toast'
import type { JobDescription } from '@/types'

export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { resumes, loading: resumeLoading, fetchResumes, editResume } = useResume(user?.uid)
  const { markAsSent } = useJobs(user?.uid)
  const processing = useProcessing()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [versionAts, setVersionAts] = useState<string | null>(null)
  const [versionOriginal, setVersionOriginal] = useState<string | null>(null)
  const [chosenVersion, setChosenVersion] = useState<'ats' | 'original' | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = job ? `${job.title} — Resume React` : 'Vaga — Resume React' }, [job])

  useEffect(() => {
    if (user?.uid) fetchResumes()
  }, [user?.uid, fetchResumes])

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

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const firstProcessed = resumes.find((r) => r.parsedData)
      if (firstProcessed) setSelectedResumeId(firstProcessed.id)
    }
  }, [resumes, selectedResumeId])

  useEffect(() => {
    if (job && id) {
      const ats = sessionStorage.getItem(`edited-${id}-ats`)
      const original = sessionStorage.getItem(`edited-${id}-original`)
      const chosen = sessionStorage.getItem(`chosen-${id}`) as 'ats' | 'original' | null
      if (ats) setVersionAts(ats)
      if (original) setVersionOriginal(original)
      if (chosen) setChosenVersion(chosen)
    }
  }, [job, id])

  const handleGenerateVersions = useCallback(async () => {
    if (!selectedResumeId || !job) return
    setGenerating(true)
    setChosenVersion(null)
    const versionId = `version-${selectedResumeId}-${job.id}-${Date.now()}`
    processing.register(versionId, 'Gerando 2 versões…')
    try {
      const [atsHtml, originalHtml] = await Promise.all([
        editResume(selectedResumeId, job.id, job.description, 'ats', job.title),
        editResume(selectedResumeId, job.id, job.description, 'original', job.title),
      ])
      setVersionAts(atsHtml)
      setVersionOriginal(originalHtml)
      sessionStorage.setItem(`edited-${job.id}-ats`, atsHtml)
      sessionStorage.setItem(`edited-${job.id}-original`, originalHtml)
      sessionStorage.removeItem(`chosen-${job.id}`)
      processing.complete(versionId, `${job.title}`, 2)
      toastSuccess('Versões geradas', 'Escolha a que prefere abaixo')
    } catch (err) {
      console.error('Generate versions error:', err)
      processing.fail(versionId, 'Erro ao gerar versões')
      toastError('Erro ao gerar versões')
    } finally {
      setGenerating(false)
    }
  }, [selectedResumeId, job, editResume, processing])

  const handleChooseVersion = async (type: 'ats' | 'original') => {
    if (!job) return
    const content = type === 'ats' ? versionAts : versionOriginal
    if (!content) return
    setChosenVersion(type)
    sessionStorage.setItem(`chosen-${job.id}`, type)
    sessionStorage.setItem(`edited-${job.id}`, content)
    toastSuccess(`Versão ${type === 'ats' ? 'ATS' : 'Original'} selecionada`)
  }

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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label="Voltar para vagas">
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
          {chosenVersion && job.status !== 'sent' && (
            <Button variant="accent" asChild>
              <Link href={`/dashboard/vagas/${job.id}/email`}>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Resume selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Currículo</CardTitle>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>Nenhum currículo encontrado.</p>
              <Button asChild className="mt-3">
                <Link href="/dashboard/curriculo">Enviar currículo</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {resumes.slice(0, 5).map((r) => {
                  const pronto = !!r.parsedData
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!pronto}
                      onClick={() => setSelectedResumeId(r.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                        !pronto && 'opacity-50 cursor-not-allowed',
                        selectedResumeId === r.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {r.originalFileName}
                      {pronto ? (
                        <span className="text-xs opacity-60">— {r.parsedData!.personal.nome}</span>
                      ) : (
                        <span className="text-xs text-warning">Processando…</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3 pt-2">
                {(() => {
                  const selectedResume = resumes.find((r) => r.id === selectedResumeId)
                  const resumePronto = !!selectedResume?.parsedData
                  let btnText = 'Gerar 2 Versões'
                  let disabled = generating || !selectedResumeId
                  if (!selectedResumeId) {
                    btnText = 'Selecione um currículo'
                  } else if (!resumePronto) {
                    btnText = 'Aguardando processamento…'
                    disabled = true
                  } else if (generating) {
                    btnText = 'Gerando…'
                  }
                  return (
                    <Button
                      onClick={handleGenerateVersions}
                      disabled={disabled}
                    >
                      {generating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {btnText}
                    </Button>
                  )
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
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

      {/* Two versions */}
      {(versionAts || versionOriginal) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Version ATS */}
          <Card className={cn(
            'relative transition-shadow',
            chosenVersion === 'ats' && 'ring-2 ring-primary shadow-lg'
          )}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Versão ATS</CardTitle>
                <Badge variant="default">ATS</Badge>
              </div>
              {chosenVersion === 'ats' ? (
                <div className="flex items-center gap-1 text-sm text-success font-medium">
                  <Check className="h-4 w-4" />
                  Selecionado
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleChooseVersion('ats')}
                  disabled={!versionAts}
                >
                  Escolher esta
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {versionAts ? (
                <div
                  className="prose prose-sm max-w-none max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(versionAts) }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version Original */}
          <Card className={cn(
            'relative transition-shadow',
            chosenVersion === 'original' && 'ring-2 ring-primary shadow-lg'
          )}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Versão Original</CardTitle>
                <Badge variant="secondary">Original</Badge>
              </div>
              {chosenVersion === 'original' ? (
                <div className="flex items-center gap-1 text-sm text-success font-medium">
                  <Check className="h-4 w-4" />
                  Selecionado
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleChooseVersion('original')}
                  disabled={!versionOriginal}
                >
                  Escolher esta
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {versionOriginal ? (
                <div
                  className="prose prose-sm max-w-none max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(versionOriginal) }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Post-view action */}
      {chosenVersion && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/vagas/${job.id}/editar`}>
              <Edit3 className="h-4 w-4 mr-2" />
              Editar manualmente
            </Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href={`/dashboard/vagas/${job.id}/email`}>
              <Send className="h-4 w-4 mr-2" />
              Enviar por Email
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
