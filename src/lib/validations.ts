import { z } from 'zod'

export const CreateJobSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200).trim(),
  description: z.string().min(1, 'Descrição é obrigatória').max(50000),
  source: z.enum(['text', 'photo']),
})

export const UpdateResumeSchema = z.object({
  content: z.string().min(1),
  templateType: z.enum(['ats', 'original']),
})

export const SendEmailApiSchema = z.object({
  subject: z.string().min(1, 'Assunto é obrigatório').max(200).trim(),
  body: z.string().min(1, 'Corpo é obrigatório').max(50000),
  to: z.string().email('Email inválido').optional(),
  accessToken: z.string().min(1, 'Token de acesso é obrigatório'),
})

const ALLOWED_DOMAINS = ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com']

function validateFirebaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_DOMAINS.includes(parsed.hostname)
  } catch {
    return false
  }
}

export const ParseResumeApiSchema = z.object({
  fileUrl: z.string().url('URL inválida').refine(validateFirebaseUrl, 'URL deve ser do Firebase Storage'),
})

export const EditResumeApiSchema = z.object({
  resumeData: z.record(z.string(), z.unknown()),
  jobDescription: z.string().min(1).max(50000),
  templateType: z.enum(['ats', 'original']).default('ats'),
  instructions: z.string().optional(),
})

export const OcrJobApiSchema = z.object({
  photoUrl: z.string().url('URL inválida').refine(validateFirebaseUrl, 'URL deve ser do Firebase Storage'),
})

export const GeneratePdfApiSchema = z.object({
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório'),
})

export const GenerateEmailApiSchema = z.object({
  resumeHtml: z.string().min(1),
  jobTitle: z.string().min(1),
  companyName: z.string().default(''),
  hiringManager: z.string().optional(),
})
