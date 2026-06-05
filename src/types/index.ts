export interface UserProfile {
  uid: string
  email: string
  name: string
  photoURL: string | null
  createdAt: number
}

export interface ResumeData {
  personal: PersonalInfo
  experience: Experience[]
  education: Education[]
  skills: string[]
  languages: Language[]
  certifications: Certification[]
}

export interface PersonalInfo {
  name: string
  email: string
  phone: string
  linkedin: string
  location: string
  summary: string
}

export interface Experience {
  company: string
  role: string
  period: string
  highlights: string[]
}

export interface Education {
  institution: string
  degree: string
  field: string
  period: string
}

export interface Language {
  language: string
  level: string
}

export interface Certification {
  name: string
  issuer: string
  year: string
}

export interface Resume {
  id: string
  userId: string
  originalFileName: string
  originalText: string
  parsedData: ResumeData | null
  storagePath: string
  createdAt: number
  updatedAt: number
}

export interface ResumeVersion {
  id: string
  resumeId: string
  jobId: string | null
  jobTitle: string
  content: string
  templateType: 'ats' | 'original'
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
