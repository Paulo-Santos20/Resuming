'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDate, truncate } from '@/lib/utils'
import { Edit3, Eye, Send, Trash2 } from 'lucide-react'
import type { JobDescription } from '@/types'

const statusConfig = {
  pending: { label: 'Pendente', variant: 'warning' as const },
  edited: { label: 'Editado', variant: 'success' as const },
  sent: { label: 'Enviado', variant: 'secondary' as const },
}

interface JobCardProps {
  job: JobDescription
  onDelete?: (jobId: string) => void
}

export function JobCard({ job, onDelete }: JobCardProps) {
  const status = statusConfig[job.status]
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete(job.id)
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/vagas/${job.id}`}>
                <Eye className="h-4 w-4 mr-1.5" />
                Detalhes
              </Link>
            </Button>
            {job.status !== 'sent' && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/vagas/${job.id}/editar`}>
                    <Edit3 className="h-4 w-4 mr-1.5" />
                    Editar
                  </Link>
                </Button>
                <Button variant="accent" asChild>
                  <Link href={`/dashboard/vagas/${job.id}/email`}>
                    <Send className="h-4 w-4 mr-1.5" />
                    Enviar
                  </Link>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDelete(true)}
              className="ml-auto text-muted-foreground hover:text-destructive"
              aria-label="Excluir vaga"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Excluir vaga"
        description={`Tem certeza que deseja excluir "${job.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
