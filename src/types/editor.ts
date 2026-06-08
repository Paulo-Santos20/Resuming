export type TemplateStyle = 'classic' | 'modern' | 'two-column' | 'minimal'

export interface ResumeFormatting {
  fontFamily: string
  fontSize: number
  lineHeight: number
  sectionSpacing: number
  pageMargins: number
  accentColor: string
}

export const DEFAULT_FORMATTING: ResumeFormatting = {
  fontFamily: 'Arial',
  fontSize: 12,
  lineHeight: 1.6,
  sectionSpacing: 16,
  pageMargins: 20,
  accentColor: '#1a3c5e',
}

export const FONT_OPTIONS = [
  'Arial',
  'Calibri',
  'Times New Roman',
  'Georgia',
  'Helvetica',
  'Verdana',
] as const

export const TEMPLATE_DISPLAY: Record<TemplateStyle, { label: string; description: string }> = {
  classic: { label: 'Clássico', description: 'Coluna única tradicional, linhas finas' },
  modern: { label: 'Moderno', description: 'Coluna única, cards com sombra' },
  'two-column': { label: 'Duas Colunas', description: 'Sidebar + conteúdo principal' },
  minimal: { label: 'Minimalista', description: 'Limpo, sem bordas, máximo espaço' },
}
