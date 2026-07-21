'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getDbInstance, getAuthInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useResume } from '@/hooks/use-resume'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Eye, Download, Check, Edit3, Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { usePageTitle } from '@/hooks/use-page-title'
import { sanitizeHtml } from '@/lib/sanitize'
import { renderResumeDataToHtml } from '@/lib/render-resume-data'
import { cn } from '@/lib/utils'
import type { JobDescription } from '@/types'

const ResumeEditor = dynamic(
  () => import('@/components/resume/resume-editor').then((m) => m.ResumeEditor),
  { ssr: false }
)

type VersionKey = 'uploaded' | 'ats' | 'original'

interface VersionTab {
  key: VersionKey
  label: string
  badge: string
  badgeVariant: 'default' | 'secondary' | 'outline'
  content: string | null
  versionId?: string
  resumeId?: string
}

export default function EditarCurriculoPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { resumes, loading: resumesLoading } = useResume(user?.uid)
  const [job, setJob] = useState<JobDescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [versionAts, setVersionAts] = useState<string | null>(null)
  const [versionOriginal, setVersionOriginal] = useState<string | null>(null)
  const [originalContent, setOriginalContent] = useState<string | null>(null)

  const [selectedVersion, setSelectedVersion] = useState<VersionKey | null>(null)
  const [resumeId, setResumeId] = useState<string>('temp')

  usePageTitle('Editar Currículo')

  // Load job
  useEffect(() => {
    if (!user?.uid || !id) return
    const load = async () => {
      try {
        const jobSnap = await getDoc(doc(getDbInstance(), 'users', user.uid, 'jobs', id))
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() } as JobDescription)
        }
      } catch (err) {
        console.error('Error loading job:', err)
      }
      setLoading(false)
    }
    load()
  }, [user?.uid, id])

  // Load versions from sessionStorage
  useEffect(() => {
    if (!id) return
    const ats = sessionStorage.getItem(`edited-${id}-ats`)
    const orig = sessionStorage.getItem(`edited-${id}-original`)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ats) setVersionAts(ats)
    if (orig) setVersionOriginal(orig)

    const storedResumeId = sessionStorage.getItem(`resume-${id}`)
    if (storedResumeId) setResumeId(storedResumeId)
  }, [id])

  // Render uploaded resume data as HTML
  useEffect(() => {
    if (!resumes.length) return
    const processed = resumes.find((r) => r.parsedData)
    if (!processed?.parsedData) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOriginalContent(renderResumeDataToHtml(processed.parsedData))
    if (!sessionStorage.getItem(`resume-${id}`)) {
      setResumeId(processed.id)
    }
  }, [resumes, id])

  // Auto-select first available version
  useEffect(() => {
    if (selectedVersion) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (versionAts) setSelectedVersion('ats')
    else if (versionOriginal) setSelectedVersion('original')
    else if (originalContent) setSelectedVersion('uploaded')
  }, [versionAts, versionOriginal, originalContent, selectedVersion])

  const tabs: VersionTab[] = useMemo(() => [
    {
      key: 'uploaded',
      label: 'Currículo Original',
      badge: 'Upload',
      badgeVariant: 'outline' as const,
      content: originalContent,
    },
    {
      key: 'ats',
      label: 'Versão ATS',
      badge: 'ATS',
      badgeVariant: 'default' as const,
      content: versionAts,
    },
    {
      key: 'original',
      label: 'Versão Original',
      badge: 'Original',
      badgeVariant: 'secondary' as const,
      content: versionOriginal,
    },
  ], [versionAts, versionOriginal, originalContent])

  const editingContent = useMemo(() => {
    if (!selectedVersion) return ''
    const tab = tabs.find((t) => t.key === selectedVersion)
    return tab?.content || ''
  }, [selectedVersion, tabs])

  const handleSelectVersion = useCallback((key: VersionKey) => {
    setSelectedVersion(key)
  }, [])

  const openPreview = useCallback((html: string) => {
    const pw = window.open('', 'rm-preview')
    if (!pw) {
      toastError('Popup bloqueado', 'Permita popups para visualizar ou use o botão de download PDF')
      return
    }
    pw.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title></title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.25; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; padding: 10mm 0; }
.page-wrap { width: 210mm; background: #fff; padding: 15mm; box-shadow: 0 1px 8px rgba(0,0,0,0.07); position: relative; }
.rm-template { color: #333; }
.rm-template h1 { font-size: 16pt; margin-bottom: 3px; }
.rm-template h2 { font-size: 12pt; border-bottom: 1.5px solid #2563eb; padding-bottom: 3px; margin-top: 8px; margin-bottom: 4px; break-before: auto; }
.rm-template h3 { font-size: 11pt; margin-top: 6px; margin-bottom: 2px; }
.rm-template p { margin-bottom: 3px; }
.rm-template ul, .rm-template ol { margin-bottom: 3px; padding-left: 18px; }
.rm-template li { margin-bottom: 1px; }
@page { size: A4; margin: 0; }
@media print { body { padding: 0; background: #fff; } .page-wrap { box-shadow: none; padding: 15mm; } }
</style></head>
<body>
<div class="page-wrap"><div class="rm-template">${sanitizeHtml(html)}</div></div>
</body></html>`)
    pw.document.close()
  }, [])

  const downloadPdf = useCallback(async (html: string, type: string) => {
    try {
      const idToken = await getAuthInstance().currentUser?.getIdToken()
      if (!idToken) throw new Error('Não autenticado')
      const res = await fetch('/api/python/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ htmlContent: html }),
      })
      if (!res.ok) throw new Error('Erro ao gerar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `curriculo-${type}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toastError('Erro ao gerar PDF')
    }
  }, [])

  const handleSaveAndExit = async () => {
    if (!user?.uid || !id) return
    setSaving(true)
    try {
      await updateDoc(doc(getDbInstance(), 'users', user.uid, 'jobs', id), {
        status: 'edited',
      })
      toastSuccess('Alterações salvas')
      router.push(`/dashboard/vagas/${id}`)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading || resumesLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Editar Currículo</h1>
          <p className="text-muted-foreground mt-1">
            {job?.title || 'Carregando…'}
          </p>
        </div>
      </div>

      {/* Version selector cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tabs.map((tab) => (
          <Card
            key={tab.key}
            className={cn(
              'relative cursor-pointer transition-all duration-200 glass-card rounded-xl',
              selectedVersion === tab.key && 'ring-2 ring-primary/50 shadow-lg'
            )}
            onClick={() => tab.content && handleSelectVersion(tab.key)}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-sm truncate">{tab.label}</CardTitle>
                <Badge variant={tab.badgeVariant} className="shrink-0">{tab.badge}</Badge>
              </div>
              {selectedVersion === tab.key && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {tab.content ? (
                <div className="relative">
                  <div
                    className="prose prose-xs max-w-none max-h-32 overflow-y-auto preview-scroll text-muted-foreground text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(tab.content) }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
                  Nenhum conteúdo disponível
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                {tab.content ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); openPreview(tab.content!) }}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); downloadPdf(tab.content!, tab.key) }}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {selectedVersion !== tab.key && (
                      <Button
                        variant="default"
                        size="sm"
                        className="ml-auto"
                        onClick={(e) => { e.stopPropagation(); handleSelectVersion(tab.key) }}
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Gere versões na página da vaga
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Editor */}
      {editingContent ? (
        <ResumeEditor
          key={selectedVersion}
          initialContent={editingContent}
          jobId={id}
          resumeId={resumeId}
          onBack={() => router.push(`/dashboard/vagas/${id}`)}
        />
      ) : (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <p>Nenhum conteúdo para editar.</p>
          <p className="text-sm mt-1">Gere uma versão na página da vaga primeiro.</p>
          <Button asChild className="mt-4">
            <a href={`/dashboard/vagas/${id}`}>Ir para a vaga</a>
          </Button>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} aria-label="Cancelar e voltar">
          Cancelar
        </Button>
        <Button onClick={handleSaveAndExit} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar e Voltar
        </Button>
      </div>
    </div>
  )
}
