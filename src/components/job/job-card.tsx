'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, truncate } from '@/lib/utils'
import { Edit3, Eye, Send, ArrowRight } from 'lucide-react'
import type { JobDescription } from '@/types'

const statusConfig = {
  pending: { label: 'Pendente', variant: 'warning' as const },
  edited: { label: 'Editado', variant: 'success' as const },
  sent: { label: 'Enviado', variant: 'secondary' as const },
}

interface JobCardProps {
  job: JobDescription
}

export function JobCard({ job }: JobCardProps) {
  const status = statusConfig[job.status]

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/vagas/${job.id}`}
              className="font-display font-semibold text-lg hover:text-brand transition-colors line-clamp-1"
            >
              {job.title}
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(job.createdAt)}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {truncate(job.description, 200)}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/vagas/${job.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              Detalhes
            </Link>
          </Button>
          {job.status !== 'sent' && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/vagas/${job.id}/editar`}>
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Link>
              </Button>
              <Button variant="accent" size="sm" asChild>
                <Link href={`/dashboard/vagas/${job.id}/email`}>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Enviar
                </Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" asChild className="ml-auto" aria-label="Ver detalhes">
            <Link href={`/dashboard/vagas/${job.id}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
