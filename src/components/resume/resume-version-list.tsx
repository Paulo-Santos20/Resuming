'use client'

import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Download } from 'lucide-react'
import type { ResumeVersion } from '@/types'

interface ResumeVersionListProps {
  versions: ResumeVersion[]
  onPreview: (version: ResumeVersion) => void
}

export function ResumeVersionList({ versions, onPreview }: ResumeVersionListProps) {
  const handleDownload = async (version: ResumeVersion) => {
    try {
      const response = await fetch('/api/python/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: version.content }),
      })
      if (!response.ok) throw new Error('Erro ao gerar PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `curriculo-${version.jobTitle || 'versao'}-v${version.versionNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download PDF error:', err)
    }
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma versão gerada ainda.</p>
        <p className="text-sm">Crie uma vaga para gerar a primeira edição.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <div
          key={version.id}
          className="flex items-center justify-between rounded-lg border p-4 bg-card hover:shadow-sm transition-shadow"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">
                v{version.versionNumber} — {version.jobTitle}
              </p>
              <Badge
                variant={version.templateType === 'ats' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {version.templateType === 'ats' ? 'ATS' : 'Original'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(version.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost" size="icon" onClick={() => onPreview(version)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(version)}
              disabled={!version.content}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
