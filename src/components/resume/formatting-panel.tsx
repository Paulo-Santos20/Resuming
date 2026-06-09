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

function RangeInput({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v >= min && v <= max) onChange(v)
          }}
          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-right font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

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

      <RangeInput
        label="Tamanho"
        value={formatting.fontSize}
        unit="pt"
        min={10}
        max={16}
        step={1}
        onChange={(v) => onChange({ fontSize: v })}
      />

      <RangeInput
        label="Altura da linha"
        value={formatting.lineHeight}
        unit=""
        min={1.0}
        max={2.0}
        step={0.1}
        onChange={(v) => onChange({ lineHeight: v })}
      />

      <RangeInput
        label="Espaçamento"
        value={formatting.sectionSpacing}
        unit="px"
        min={4}
        max={24}
        step={2}
        onChange={(v) => onChange({ sectionSpacing: v })}
      />

      <RangeInput
        label="Margens"
        value={formatting.pageMargins}
        unit="mm"
        min={10}
        max={30}
        step={2}
        onChange={(v) => onChange({ pageMargins: v })}
      />

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
