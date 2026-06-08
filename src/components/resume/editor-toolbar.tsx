'use client'

import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  const groups = [
    [
      { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Negrito' },
      { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Itálico' },
      { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), label: 'Sublinhado' },
    ],
    [
      { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), label: 'Título 1' },
      { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'Título 2' },
      { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'Título 3' },
    ],
    [
      { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Lista' },
      { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Lista numerada' },
    ],
    [
      { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), label: 'Alinhar esquerda' },
      { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), label: 'Centralizar' },
      { icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), label: 'Alinhar direita' },
    ],
    [
      { icon: Undo2, action: () => editor.chain().focus().undo().run(), active: false, label: 'Desfazer' },
      { icon: Redo2, action: () => editor.chain().focus().redo().run(), active: false, label: 'Refazer' },
    ],
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-muted/30 p-1.5">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <div className="mx-1 h-5 w-px bg-border" />}
          {group.map((btn) => (
            <Button
              key={btn.label}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                btn.active && 'bg-accent text-accent-foreground'
              )}
              onClick={btn.action}
              aria-label={btn.label}
              title={btn.label}
            >
              <btn.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      ))}
    </div>
  )
}
