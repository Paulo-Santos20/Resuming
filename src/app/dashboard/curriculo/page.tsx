'use client'

import { useAuth } from '@/hooks/use-auth'
import { useResume } from '@/hooks/use-resume'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResumeUpload } from '@/components/resume/resume-upload'
import { Skeleton } from '@/components/ui/skeleton'

export default function CurriculoPage() {
  const { user } = useAuth()
  const { resumes, loading, uploadResume, fetchResumes } = useResume(user?.uid)

  useEffect(() => {
    if (user?.uid) fetchResumes()
  }, [user?.uid, fetchResumes])

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
                className="flex items-center justify-between rounded-lg border p-4 bg-card"
              >
                <div>
                  <p className="font-medium text-sm">{resume.originalFileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {resume.parsedData
                      ? `${resume.parsedData.personal.name} — ${resume.parsedData.skills.length} habilidades detectadas`
                      : 'Aguardando processamento…'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
