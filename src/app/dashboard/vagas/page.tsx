'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useJobs } from '@/hooks/use-jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { JobCard } from '@/components/job/job-card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toastError } from '@/lib/toast'
import { usePageTitle } from '@/hooks/use-page-title'

const statusLabels = {
  all: 'Todos',
  pending: 'Pendentes',
  edited: 'Editados',
  sent: 'Enviados',
} as const

type StatusFilter = keyof typeof statusLabels

export default function VagasPage() {
  const { user } = useAuth()
  const { jobs, loading, fetchJobs } = useJobs(user?.uid)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  usePageTitle('Vagas')

  useEffect(() => {
    if (user?.uid) {
      try {
        fetchJobs()
      } catch {
        toastError('Erro ao carregar vagas')
      }
    }
  }, [user?.uid, fetchJobs])

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [jobs, search, statusFilter])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(Object.entries(statusLabels) as [StatusFilter, string][]).map(([key, label]) => (
            <Button
              key={key}
              variant={statusFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={jobs.length === 0 ? 'Nenhuma vaga adicionada ainda' : 'Nenhuma vaga encontrada'}
          description={
            jobs.length === 0
              ? 'Adicione sua primeira vaga para começar a editar currículos'
              : 'Tente ajustar a busca ou o filtro'
          }
          action={
            jobs.length === 0
              ? { label: 'Adicionar Vaga', onClick: () => {} }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
