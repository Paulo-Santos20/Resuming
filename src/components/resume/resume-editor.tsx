'use client'

import { useCallback, useEffect } from 'react'
import { EditorContent } from '@tiptap/react'
import { useResumeEditor } from '@/hooks/use-resume-editor'
import { EditorToolbar } from './editor-toolbar'
import { FormattingPanel } from './formatting-panel'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
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

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handlePreview = useCallback(async () => {
    const content = editor.getHTML()
    const res = await fetch(`/styles/templates/${templateStyle}.css`)
    const templateCss = await res.text()

    const pw = window.open('', 'rm-preview')
    if (!pw) return

    pw.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Pré-visualização</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-size: ${formatting.fontSize}pt;
  line-height: ${formatting.lineHeight};
  background: #f5f5f5;
  display: flex;
  justify-content: center;
  padding: 20mm 0;
}
.preview-page {
  width: 210mm;
  background: #fff;
  padding: ${formatting.pageMargins}mm;
  box-shadow: var(--rm-card-shadow, 0 2px 12px rgba(0,0,0,0.1));
}
.rm-template {
  font-family: var(--rm-font, ${formatting.fontFamily}, sans-serif);
  color: var(--rm-text, #333);
}
.rm-template h1, .rm-template h2, .rm-template h3 {
  color: var(--rm-accent, ${formatting.accentColor});
  font-family: var(--rm-font, ${formatting.fontFamily}, sans-serif);
}
.rm-template h1 { font-size: ${Math.min(formatting.fontSize + 6, 22)}pt; margin-bottom: 4px; }
.rm-template h2 { font-size: ${Math.min(formatting.fontSize + 3, 17)}pt; border-bottom: var(--rm-section-border, 2px solid ${formatting.accentColor}); padding-bottom: 4px; margin-top: ${formatting.sectionSpacing}px; margin-bottom: 8px; }
.rm-template h3 { font-size: ${formatting.fontSize + 1}pt; margin-top: ${formatting.sectionSpacing * 0.7}px; margin-bottom: 4px; }
.rm-template p { margin-bottom: ${formatting.sectionSpacing * 0.4}px; }
.rm-template ul, .rm-template ol { margin-bottom: ${formatting.sectionSpacing * 0.4}px; padding-left: 20px; }
.rm-template li { margin-bottom: 2px; }
${templateCss}
</style></head>
<body><div class="preview-page"><div class="rm-template">${sanitizeHtml(content)}</div></div></body></html>`)
    pw.document.close()
  }, [editor, formatting, templateStyle])

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 min-w-0">
        <div className="rounded-lg border bg-card overflow-hidden">
          <EditorToolbar editor={editor} />
          <style>{`
            .rm-template {
              font-family: ${formatting.fontFamily}, sans-serif;
              font-size: ${formatting.fontSize}pt;
              line-height: ${formatting.lineHeight};
              --rm-font: ${formatting.fontFamily}, sans-serif;
              --rm-accent: ${formatting.accentColor};
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
            {isDirty && <span className="text-xs text-muted-foreground">Alterações não salvas</span>}
            {lastSaved && !isDirty && (
              <span className="text-xs text-muted-foreground">
                Salvo {new Date(lastSaved).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
            <Button onClick={save} disabled={saving || !isDirty}>
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
        <div className="rounded-lg border bg-card p-4 space-y-4 sticky top-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
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
