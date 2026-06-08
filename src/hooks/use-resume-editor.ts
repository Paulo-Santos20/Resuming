'use client'

import { useState, useCallback } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import { doc, updateDoc, addDoc, collection, query, orderBy, getDocs, limit } from 'firebase/firestore'
import { getDbInstance } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { toastSuccess } from '@/lib/toast'
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] px-4 py-4',
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
      const html = editor.getHTML()
      const db = getDbInstance()

      sessionStorage.setItem(`edited-${jobId}`, html)

      const resumeRef = doc(db, 'users', user.uid, 'resumes', resumeId)
      const versionsRef = collection(resumeRef, 'versions')

      if (versionId) {
        await updateDoc(doc(versionsRef, versionId), {
          content: html,
          templateStyle,
          formatting,
          updatedAt: Date.now(),
        })
      } else {
        const q = query(versionsRef, orderBy('versionNumber', 'desc'), limit(1))
        const snap = await getDocs(q)
        const nextVersion = snap.docs.length > 0
          ? (snap.docs[0].data().versionNumber || 0) + 1
          : 1
        await addDoc(versionsRef, {
          resumeId,
          jobId,
          jobTitle: '',
          content: html,
          templateStyle,
          formatting,
          templateType: 'original',
          versionNumber: nextVersion,
          createdAt: Date.now(),
        })
      }

      setIsDirty(false)
      setLastSaved(Date.now())
      toastSuccess('Alterações salvas')
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }, [user?.uid, resumeId, jobId, versionId, editor, templateStyle, formatting])

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
