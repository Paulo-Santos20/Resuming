'use client'

import { useState, useCallback, useRef } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import { doc, updateDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { toastSuccess, toastError } from '@/lib/toast'
import { sanitizeHtml } from '@/lib/sanitize'
import type { ResumeFormatting, TemplateStyle } from '@/types/editor'
import { DEFAULT_FORMATTING } from '@/types/editor'

interface UseResumeEditorOptions {
  versionId?: string
  resumeId: string
  jobId: string
  initialContent: string
  initialFormatting?: Partial<ResumeFormatting>
  initialTemplate?: TemplateStyle
}

export function useResumeEditor({
  versionId,
  resumeId,
  jobId,
  initialContent,
  initialFormatting,
  initialTemplate = 'classic',
}: UseResumeEditorOptions) {
  const { user } = useAuth()
  const [formatting, setFormattingState] = useState<ResumeFormatting>({
    ...DEFAULT_FORMATTING,
    ...initialFormatting,
  })
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>(initialTemplate)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const formattingRef = useRef(formatting)
  const templateRef = useRef(templateStyle)
  formattingRef.current = formatting
  templateRef.current = templateStyle

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily,
    ],
    content: initialContent || '<p></p>',
    onUpdate: () => setIsDirty(true),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] md:min-h-[500px] px-4 py-4',
      },
    },
  })

  const setFormatting = useCallback((patch: Partial<ResumeFormatting>) => {
    setFormattingState((prev) => ({ ...prev, ...patch }))
    setIsDirty(true)
  }, [])

  const save = useCallback(async () => {
    if (!user?.uid || !editor) return
    setSaving(true)
    try {
      const rawHtml = editor.getHTML()
      const html = sanitizeHtml(rawHtml)
      const db = getDbInstance()
      const currentFormatting = formattingRef.current
      const currentTemplate = templateRef.current

      sessionStorage.setItem(`edited-${jobId}`, html)

      const versionRef = doc(collection(db, 'users', user.uid, 'resumes', resumeId, 'versions'))
      await setDoc(versionRef, {
        resumeId,
        jobId: jobId || '',
        jobTitle: '',
        content: html,
        templateType: 'ats',
        templateStyle: currentTemplate,
        formatting: currentFormatting,
        versionNumber: Date.now(),
        createdAt: serverTimestamp(),
      })

      if (jobId) {
        await updateDoc(doc(db, 'users', user.uid, 'jobs', jobId), {
          status: 'edited',
        })
      }

      setIsDirty(false)
      setLastSaved(Date.now())
      toastSuccess('Alterações salvas')
    } catch (err) {
      console.error('Save error:', err)
      toastError('Erro ao salvar', err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }, [user?.uid, resumeId, jobId, editor])

  return {
    editor,
    formatting,
    templateStyle,
    setFormatting,
    setTemplateStyle,
    save,
    isDirty,
    lastSaved,
    saving,
  }
}
