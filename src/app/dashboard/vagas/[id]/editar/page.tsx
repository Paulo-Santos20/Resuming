'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Eye, FileEdit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toastSuccess, toastError } from '@/lib/toast'
import { sanitizeHtml } from '@/lib/sanitize'
import type { JobDescription } from '@/types'

export default function EditarCurriculoPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [job, setJob] = useState<JobDescription | null>(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Editar Currículo — Resume React' }, [])

  useEffect(() => {
    if (!user?.uid || !id) return
    const load = async () => {
      const snap = await getDoc(doc(getDbInstance(), 'users', user.uid, 'jobs', id))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as JobDescription
        setJob(data)
      }
      setLoading(false)
    }
    load()
  }, [user?.uid, id])

  useEffect(() => {
    if (id) {
      const cached = sessionStorage.getItem(`edited-${id}`)
      if (cached) setContent(cached)
    }
  }, [id])

  const handleSave = async () => {
    if (!user?.uid || !id) return
    setSaving(true)
    try {
      if (content) {
        sessionStorage.setItem(`edited-${id}`, content)
      }
      await updateDoc(doc(getDbInstance(), 'users', user.uid, 'jobs', id), {
        status: 'edited',
      })
      toastSuccess('Alterações salvas')
      router.push(`/dashboard/vagas/${id}`)
    } catch (err) {
      console.error('Save error:', err)
      toastError('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="edit" className="space-y-4">
            <TabsList>
              <TabsTrigger value="edit">
                <FileEdit className="h-4 w-4 mr-2" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit">
              <div className="space-y-4">
                <Label htmlFor="edit-content">Conteúdo do Currículo (HTML)</Label>
                <Textarea
                  id="edit-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={24}
                  className="font-mono text-sm"
                  placeholder="Edite o HTML do currículo manualmente..."
                />
              </div>
            </TabsContent>

            <TabsContent value="preview">
              {content ? (
                <div
                  className="prose prose-sm max-w-none border rounded-lg p-8 bg-card"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum conteúdo para visualizar</p>
                  <p className="text-sm mt-1">Edite o currículo ou gere uma versão com IA primeiro.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} aria-label="Cancelar e voltar">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>
    </div>
  )
}
