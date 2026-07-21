'use client'

import { useCallback, useEffect } from 'react'
import { EditorContent } from '@tiptap/react'
import { useResumeEditor } from '@/hooks/use-resume-editor'
import { EditorToolbar } from './editor-toolbar'
import { FormattingPanel } from './formatting-panel'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import { toastError } from '@/lib/toast'
import type { ResumeFormatting, TemplateStyle } from '@/types/editor'

interface ResumeEditorProps {
  initialContent: string
  jobId: string
  resumeId: string
  versionId?: string
  initialFormatting?: Partial<ResumeFormatting>
  initialTemplate?: TemplateStyle
  onBack?: () => void
}

export function ResumeEditor({
  initialContent,
  jobId,
  resumeId,
  versionId,
  initialFormatting,
  initialTemplate,
  onBack,
}: ResumeEditorProps) {
  const {
    editor,
    formatting,
    templateStyle,
    setFormatting,
    setTemplateStyle,
    save,
    isDirty,
    lastSaved,
    saving,
  } = useResumeEditor({
    versionId,
    resumeId,
    jobId,
    initialContent,
    initialFormatting,
    initialTemplate,
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !saving) save()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [save, isDirty, saving])

  const handlePreview = useCallback(async () => {
    if (!editor) return
    try {
      const content = editor.getHTML()
      const res = await fetch(`/styles/templates/${templateStyle}.css`)
      const templateCss = res.ok ? await res.text() : ''

      const pw = window.open('', 'rm-preview')
      if (!pw) {
        toastError('Popup bloqueado', 'Permita popups para visualizar ou use o botão de download PDF')
        return
      }

      pw.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title></title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10mm 0;
}
.page-wrap { width: 210mm; background: #fff; padding: ${formatting.pageMargins}mm; box-shadow: 0 1px 8px rgba(0,0,0,0.07); position: relative; }
.rm-template {
  --rm-font: ${formatting.fontFamily}, sans-serif;
  --rm-accent: ${formatting.accentColor};
  --accent-color: ${formatting.accentColor};
  --rm-section-spacing: ${formatting.sectionSpacing}px;
}
${templateCss}
.rm-template {
  font-family: var(--rm-font, ${formatting.fontFamily}, sans-serif);
  font-size: ${formatting.fontSize}pt;
  line-height: ${formatting.lineHeight};
}
.rm-template h1 {
  font-size: ${Math.min(formatting.fontSize + 6, 22)}pt;
  margin-bottom: 3px;
}
.rm-template h2 {
  font-size: ${Math.min(formatting.fontSize + 3, 17)}pt;
  border-bottom: 2px solid ${formatting.accentColor};
  padding-bottom: 3px;
  margin-top: ${formatting.sectionSpacing}px;
  margin-bottom: 4px;
  break-before: auto;
}
.rm-template h3 {
  font-size: ${formatting.fontSize + 1}pt;
  margin-top: ${formatting.sectionSpacing * 0.5}px;
  margin-bottom: 2px;
}
.rm-template p {
  margin-bottom: 3px;
}
.rm-template ul, .rm-template ol {
  margin-bottom: 3px;
  padding-left: 18px;
}
.rm-template li {
  margin-bottom: 1px;
}
@media print { body { padding: 0; background: #fff; } .page-wrap { box-shadow: none; } }
@page { size: A4; margin: 0; }
</style></head>
<body>
<div class="page-wrap"><div class="rm-template">${sanitizeHtml(content)}</div></div>
</body></html>`)
      pw.document.close()
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
      toastError('Erro ao gerar preview', 'Não foi possível abrir a visualização. Tente novamente.')
    }
  }, [editor, formatting, templateStyle])

  if (!editor) {
    return (
      <div className="glass-card rounded-xl flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">Carregando editor…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 min-w-0">
        <div className="glass-card overflow-hidden rounded-xl">
          <EditorToolbar editor={editor} />
          <style>{`
            .rm-template {
              font-family: ${formatting.fontFamily}, sans-serif;
              font-size: ${formatting.fontSize}pt;
              line-height: ${formatting.lineHeight};
              --rm-font: ${formatting.fontFamily}, sans-serif;
              --rm-accent: ${formatting.accentColor};
              --accent-color: ${formatting.accentColor};
              --rm-section-spacing: ${formatting.sectionSpacing}px;
            }
            .rm-template .ProseMirror h1,
            .rm-template .ProseMirror h2,
            .rm-template .ProseMirror h3 {
              color: ${formatting.accentColor};
            }
            .rm-template .ProseMirror h2 {
              border-bottom: 2px solid ${formatting.accentColor};
              padding-bottom: 4px;
              margin-top: ${formatting.sectionSpacing}px;
            }
            .rm-template .ProseMirror h3 {
              margin-top: ${formatting.sectionSpacing}px;
            }
            .rm-template .ProseMirror p {
              margin-bottom: ${formatting.sectionSpacing * 0.5}px;
            }
            .rm-template .ProseMirror ul,
            .rm-template .ProseMirror ol {
              margin-bottom: ${formatting.sectionSpacing * 0.5}px;
            }
          `}</style>
          <div className="rm-template">
            <EditorContent editor={editor} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" onClick={onBack} aria-label="Voltar">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDirty && <span className="hidden sm:inline text-xs text-muted-foreground">Alterações não salvas</span>}
            {lastSaved && !isDirty && (
              <span className="text-xs text-muted-foreground">
                Salvo {new Date(lastSaved).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <Button variant="outline" onClick={handlePreview} className="transition-all duration-200">
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
            <Button onClick={save} disabled={saving || !isDirty} className="transition-all duration-200">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-72 shrink-0">
        <div className="glass-card rounded-xl p-5 space-y-4 sticky top-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Formatação
          </h3>
          <FormattingPanel
            formatting={formatting}
            onChange={setFormatting}
            templateStyle={templateStyle}
            onTemplateChange={setTemplateStyle}
          />
        </div>
      </div>
    </div>
  )
}
