'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, collection, collectionGroup, getDocs, updateDoc, query, orderBy, where } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save } from 'lucide-react'
import { toastSuccess } from '@/lib/toast'
import type { JobDescription, ResumeVersion } from '@/types'
import type { ResumeFormatting, TemplateStyle } from '@/types/editor'
import { DEFAULT_FORMATTING } from '@/types/editor'

const ResumeEditor = dynamic(
  () => import('@/components/resume/resume-editor').then((m) => m.ResumeEditor),
  { ssr: false }
)

export default function EditarCurriculoPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [initialContent, setInitialContent] = useState('')
  const [versionId, setVersionId] = useState<string | undefined>(undefined)
  const [resumeId, setResumeId] = useState<string | undefined>(undefined)
  const [initialFormatting, setInitialFormatting] = useState<Partial<ResumeFormatting>>({})
  const [initialTemplate, setInitialTemplate] = useState<TemplateStyle>('classic')

  useEffect(() => { document.title = 'Editar Currículo — Resume React' }, [])

  useEffect(() => {
    if (!user?.uid || !id) return
    const load = async () => {
      try {
        const jobSnap = await getDoc(doc(getDbInstance(), 'users', user.uid, 'jobs', id))
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() } as JobDescription)
        }

        const cached = sessionStorage.getItem(`edited-${id}`)
        if (cached) {
          setInitialContent(cached)
        }

        const versionsQuery = query(
          collectionGroup(getDbInstance(), 'versions'),
          where('jobId', '==', id),
          orderBy('createdAt', 'desc')
        )
        const versionsSnap = await getDocs(versionsQuery)
        const allVersions: ResumeVersion[] = versionsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ResumeVersion
        )
        if (allVersions.length > 0) {
          allVersions.sort((a, b) => b.createdAt - a.createdAt)
          const latest = allVersions[0]
          if (!cached) setInitialContent(latest.content)
          setVersionId(latest.id)
          setResumeId(latest.resumeId)
          if (latest.formatting) setInitialFormatting(latest.formatting)
          if (latest.templateStyle) setInitialTemplate(latest.templateStyle)
        }
      } catch (err) {
        console.error('Error loading edit page:', err)
      }
      setLoading(false)
    }
    load()
  }, [user?.uid, id])

  // Infer resumeId from sessionStorage if not found in versions
  useEffect(() => {
    if (!resumeId && !loading) {
      const storedResumeId = sessionStorage.getItem(`resume-${id}`)
      if (storedResumeId) setResumeId(storedResumeId)
    }
  }, [resumeId, loading, id])

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {resumeId ? (
        <ResumeEditor
          initialContent={initialContent}
          jobId={id}
          resumeId={resumeId}
          versionId={versionId}
          initialFormatting={initialFormatting}
          initialTemplate={initialTemplate}
          onBack={() => router.push(`/dashboard/vagas/${id}`)}
        />
      ) : initialContent ? (
        <ResumeEditor
          initialContent={initialContent}
          jobId={id}
          resumeId="temp"
          initialFormatting={initialFormatting}
          initialTemplate={initialTemplate}
          onBack={() => router.push(`/dashboard/vagas/${id}`)}
        />
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <p>Nenhum conteúdo para editar.</p>
          <p className="text-sm mt-1">Gere uma versão na página da vaga primeiro.</p>
          <Button asChild className="mt-4">
            <a href={`/dashboard/vagas/${id}`}>Ir para a vaga</a>
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} aria-label="Cancelar e voltar">
          Cancelar
        </Button>
        <Button onClick={handleSaveAndExit} disabled={saving}>
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar e Voltar
        </Button>
      </div>
    </div>
  )
}
