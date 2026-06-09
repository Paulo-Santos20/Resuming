'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useJobs } from '@/hooks/use-jobs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { JobCard } from '@/components/job/job-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function VagasPage() {
  const { user } = useAuth()
  const { jobs, loading, fetchJobs } = useJobs(user?.uid)

  useEffect(() => { document.title = 'Vagas — Resuming' }, [])

  useEffect(() => {
    if (user?.uid) fetchJobs()
  }, [user?.uid, fetchJobs])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Vagas</h1>
          <p className="text-muted-foreground mt-1">
            Adicione vagas e edite seu currículo para cada uma
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vagas/nova">
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed bg-card">
          <p className="font-medium">Nenhuma vaga adicionada ainda</p>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Adicione sua primeira vaga para começar a editar currículos
          </p>
          <Button asChild>
            <Link href="/dashboard/vagas/nova">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vaga
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
