'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useResume } from '@/hooks/use-resume'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResumeUpload } from '@/components/resume/resume-upload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Eye, Trash2, Clock, Edit3 } from 'lucide-react'

export default function CurriculoPage() {
  const { user } = useAuth()
  const { resumes, loading, uploadResume, fetchResumes, deleteResume } = useResume(user?.uid)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { document.title = 'Currículo — Resuming' }, [])

  useEffect(() => {
    if (user?.uid) fetchResumes()
  }, [user?.uid, fetchResumes])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteResume(deleteId)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const resumeToDelete = deleteId ? resumes.find((r) => r.id === deleteId) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Meu Currículo</h1>
        <p className="text-muted-foreground mt-1">
          Faça upload do seu currículo em PDF para começar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumeUpload onUpload={uploadResume} loading={loading} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Versões</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-lg border bg-card">
            <p>Nenhum currículo enviado ainda.</p>
            <p className="text-sm mt-1">Faça upload do seu PDF acima.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 bg-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate max-w-full">{resume.originalFileName}</p>
                    {(!resume.parsedData && resume.status !== 'error') && (
                      <Badge variant="warning" className="shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Processando
                      </Badge>
                    )}
                    {resume.status === 'error' && (
                      <Badge variant="destructive" className="shrink-0">
                        Erro
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {resume.parsedData?.personal?.nome
                      ? `${resume.parsedData.personal.nome} — ${resume.parsedData.habilidades?.length ?? 0} habilidades`
                      : resume.parsedData
                        ? 'Processamento incompleto — dados parciais'
                        : resume.status === 'error'
                          ? 'Falha no processamento'
                          : 'Aguardando processamento pelo backend…'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Visualizar PDF"
                      onClick={() => {
                        const url = resume.downloadURL || (
                          `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(resume.storagePath)}?alt=media`
                        )
                        window.open(url, '_blank')
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {resume.parsedData && (
                      <Button variant="ghost" size="icon" aria-label="Editar currículo" asChild>
                        <Link href={`/dashboard/curriculo/${resume.id}/editar`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir currículo"
                    onClick={() => setDeleteId(resume.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Excluir currículo"
        description={
          resumeToDelete
            ? `Tem certeza que deseja excluir "${resumeToDelete.originalFileName}"? Esta ação não pode ser desfeita.`
            : 'Tem certeza que deseja excluir este currículo?'
        }
        confirmLabel={deleting ? 'Excluindo…' : 'Excluir'}
        variant="destructive"
        loading={deleting}
      />

    </div>
  )
}
