'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import type { Resume, ResumeVersion, ResumeData } from '@/types'
import type { ResumeFormatting, TemplateStyle } from '@/types/editor'

const ResumeEditor = dynamic(
  () => import('@/components/resume/resume-editor').then((m) => m.ResumeEditor),
  { ssr: false }
)

function resumeDataToHtml(data: ResumeData): string {
  const p = data.personal
  const parts: string[] = []

  if (p?.nome) parts.push(`<h1>${p.nome}</h1>`)

  const contact = [p?.email, p?.telefone, p?.endereco].filter(Boolean).join(' &vert; ')
  if (contact) parts.push(`<p>${contact}</p>`)
  if (p?.linkedin) parts.push(`<p>${p.linkedin}</p>`)
  if (p?.resumo) parts.push(`<h2>Resumo</h2><p>${p.resumo}</p>`)

  if (data.experiencia?.length) {
    parts.push('<h2>Experiência</h2>')
    for (const e of data.experiencia) {
      parts.push(`<h3>${e.cargo || ''}${e.empresa ? ` &mdash; ${e.empresa}` : ''}</h3>`)
      if (e.periodo) parts.push(`<p>${e.periodo}</p>`)
      if (e.realizacoes?.length) {
        parts.push('<ul>' + e.realizacoes.map((r) => `<li>${r}</li>`).join('') + '</ul>')
      }
    }
  }

  if (data.educacao?.length) {
    parts.push('<h2>Educação</h2>')
    for (const e of data.educacao) {
      parts.push(`<p><strong>${e.curso || ''}</strong>${e.instituicao ? ` &mdash; ${e.instituicao}` : ''}${e.periodo ? ` (${e.periodo})` : ''}</p>`)
    }
  }

  if (data.habilidades?.length) {
    parts.push(`<h2>Habilidades</h2><p>${data.habilidades.join(', ')}</p>`)
  }

  if (data.idiomas?.length) {
    parts.push('<h2>Idiomas</h2>')
    for (const i of data.idiomas) {
      parts.push(`<p>${i.idioma}${i.nivel ? ` &mdash; ${i.nivel}` : ''}</p>`)
    }
  }

  if (data.certificacoes?.length) {
    parts.push('<h2>Certificações</h2>')
    for (const c of data.certificacoes) {
      parts.push(`<p>${c.nome}${c.instituicao ? ` &mdash; ${c.instituicao}` : ''}${c.ano ? ` (${c.ano})` : ''}</p>`)
    }
  }

  return parts.join('\n')
}

export default function EditarCurriculoDirectPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [initialContent, setInitialContent] = useState('')
  const [resumeId, setResumeId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Editar Currículo — Resuming'
  }, [])

  useEffect(() => {
    if (!user?.uid || !id) return

    const load = async () => {
      try {
        const db = getDbInstance()
        const resumeSnap = await getDoc(doc(db, 'users', user.uid, 'resumes', id))
        if (!resumeSnap.exists()) {
          setError('Currículo não encontrado')
          setLoading(false)
          return
        }
        const resume = { id: resumeSnap.id, ...resumeSnap.data() } as Resume
        setResumeId(resume.id)

        const cached = sessionStorage.getItem(`edited-${id}`)
        if (cached) {
          setInitialContent(cached)
          setLoading(false)
          return
        }

        const vSnap = await getDocs(
          query(
            collection(db, 'users', user.uid, 'resumes', resume.id, 'versions'),
            orderBy('createdAt', 'desc')
          )
        )
        if (!vSnap.empty) {
          const latest = vSnap.docs[0].data() as ResumeVersion
          if (latest.content) {
            setInitialContent(latest.content)
            setLoading(false)
            return
          }
        }

        if (resume.parsedData) {
          setInitialContent(resumeDataToHtml(resume.parsedData))
        } else {
          setError('Currículo ainda não processado')
        }
      } catch (err) {
        console.error('Error loading resume for edit:', err)
        setError('Erro ao carregar currículo')
      }
      setLoading(false)
    }

    load()
  }, [user?.uid, id])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-2xl font-bold">Editar Currículo</h1>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <p>{error}</p>
          <Button asChild className="mt-4">
            <a href="/dashboard/curriculo">Voltar para currículos</a>
          </Button>
        </div>
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
            Editando currículo carregado
          </p>
        </div>
      </div>

      {resumeId && initialContent && (
        <ResumeEditor
          initialContent={initialContent}
          jobId={id}
          resumeId={resumeId}
          onBack={() => router.push('/dashboard/curriculo')}
        />
      )}
    </div>
  )
}
