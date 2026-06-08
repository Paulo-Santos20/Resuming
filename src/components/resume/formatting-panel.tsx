'use client'

import { useEffect } from 'react'
import { TemplateSelector } from './template-selector'
import { FONT_OPTIONS } from '@/types/editor'
import type { ResumeFormatting, TemplateStyle } from '@/types/editor'

interface FormattingPanelProps {
  formatting: ResumeFormatting
  onChange: (patch: Partial<ResumeFormatting>) => void
  templateStyle: TemplateStyle
  onTemplateChange: (t: TemplateStyle) => void
}

const COLOR_PRESETS = [
  '#1a3c5e',
  '#2d6a4f',
  '#3b5998',
  '#8b4513',
  '#6b21a8',
  '#be123c',
  '#0f766e',
  '#52525b',
]

export function FormattingPanel({
  formatting,
  onChange,
  templateStyle,
  onTemplateChange,
}: FormattingPanelProps) {
  useEffect(() => {
    const id = 'rm-template-css'
    const existing = document.getElementById(id)
    if (existing) existing.remove()

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/styles/templates/${templateStyle}.css`
    link.id = id
    document.head.appendChild(link)

    return () => {
      const el = document.getElementById(id)
      if (el) el.remove()
    }
  }, [templateStyle])

  return (
    <div className="space-y-5">
      <TemplateSelector value={templateStyle} onChange={onTemplateChange} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Fonte</p>
        <select
          value={formatting.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tamanho</p>
          <span className="text-xs text-muted-foreground">{formatting.fontSize}pt</span>
        </div>
        <input
          type="range"
          min="10"
          max="16"
          step="1"
          value={formatting.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10</span><span>16</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Altura da linha</p>
          <span className="text-xs text-muted-foreground">{formatting.lineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="1.0"
          max="2.0"
          step="0.1"
          value={formatting.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Espaçamento</p>
          <span className="text-xs text-muted-foreground">{formatting.sectionSpacing}px</span>
        </div>
        <input
          type="range"
          min="4"
          max="24"
          step="2"
          value={formatting.sectionSpacing}
          onChange={(e) => onChange({ sectionSpacing: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Margens</p>
          <span className="text-xs text-muted-foreground">{formatting.pageMargins}mm</span>
        </div>
        <input
          type="range"
          min="10"
          max="30"
          step="2"
          value={formatting.pageMargins}
          onChange={(e) => onChange({ pageMargins: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Cor de destaque</p>
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ accentColor: color })}
              className="h-6 w-6 rounded-full border border-border transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              aria-label={`Cor ${color}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="color"
            value={formatting.accentColor}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="h-7 w-10 cursor-pointer rounded border border-border"
          />
          <span className="text-xs text-muted-foreground font-mono">{formatting.accentColor}</span>
        </div>
      </div>
    </div>
  )
}
