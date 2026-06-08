export interface UserProfile {
  uid: string
  email: string
  name: string
  photoURL: string | null
  createdAt: number
}

export interface ResumeData {
  personal: PersonalInfo
  experiencia: Experience[]
  educacao: Education[]
  habilidades: string[]
  idiomas: Language[]
  certificacoes: Certification[]
}

export interface PersonalInfo {
  nome: string
  email: string
  telefone: string
  linkedin: string
  endereco: string
  resumo: string
}

export interface Experience {
  empresa: string
  cargo: string
  periodo: string
  realizacoes: string[]
}

export interface Education {
  instituicao: string
  grau: string
  curso: string
  periodo: string
}

export interface Language {
  idioma: string
  nivel: string
}

export interface Certification {
  nome: string
  instituicao: string
  ano: string
}

export type ResumeStatus = 'processing' | 'completed' | 'error'

export interface Resume {
  id: string
  userId: string
  originalFileName: string
  originalText: string
  parsedData: ResumeData | null
  status?: ResumeStatus
  storagePath: string
  downloadURL: string
  createdAt: number
  updatedAt: number
}

import type { TemplateStyle, ResumeFormatting } from './editor'

export interface ResumeVersion {
  id: string
  resumeId: string
  jobId: string | null
  jobTitle: string
  content: string
  templateType: 'ats' | 'original'
  templateStyle?: TemplateStyle
  formatting?: ResumeFormatting
  versionNumber: number
  createdAt: number
}

export interface JobDescription {
  id: string
  userId: string
  title: string
  description: string
  source: 'text' | 'photo'
  photoPath: string | null
  status: 'pending' | 'edited' | 'sent'
  emailSentAt: number | null
  createdAt: number
}

export interface EmailDraft {
  id: string
  userId: string
  jobId: string
  resumeVersionId: string
  subject: string
  body: string
  sentAt: number | null
  createdAt: number
}
