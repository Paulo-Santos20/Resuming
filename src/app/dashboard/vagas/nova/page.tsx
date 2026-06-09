'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useJobs } from '@/hooks/use-jobs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobForm } from '@/components/job/job-form'

export default function NovaVagaPage() {
  useEffect(() => { document.title = 'Nova Vaga — Resuming' }, [])
  const { user } = useAuth()
  const { loading, createJob } = useJobs(user?.uid)
  const router = useRouter()

  const handleSubmit = async (title: string, description: string, photoFile?: File) => {
    const id = await createJob(title, description, photoFile)
    if (id) router.push(`/dashboard/vagas/${id}`)
    return id
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Nova Vaga</h1>
        <p className="text-muted-foreground mt-1">
          Cole a descrição da vaga ou envie uma foto para extrair o texto automaticamente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Vaga</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm onSubmit={handleSubmit} loading={loading} />
        </CardContent>
      </Card>
    </div>
  )
}
