'use client'

import { cn } from '@/lib/utils'
import type { TemplateStyle } from '@/types/editor'
import { TEMPLATE_DISPLAY } from '@/types/editor'

const TEMPLATE_PREVIEW: Record<TemplateStyle, string> = {
  classic: 'M8 8h16M8 16h16M8 24h12',
  modern: 'M8 8h16v4M8 16h16v2M8 22h12',
  'two-column': 'M6 8h6v22M16 8h14',
  minimal: 'M10 8h20M10 18h18',
}

interface TemplateSelectorProps {
  value: TemplateStyle
  onChange: (t: TemplateStyle) => void
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Template</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(TEMPLATE_DISPLAY) as TemplateStyle[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs min-h-[44px] transition-colors',
              value === key
                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            <svg viewBox="0 0 32 36" className="h-10 w-full max-w-[56px]">
              <rect width="32" height="36" rx="1.5" fill="currentColor" opacity="0.1" />
              <path
                d={TEMPLATE_PREVIEW[key]}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
            </svg>
            <span className="font-medium">{TEMPLATE_DISPLAY[key].label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
