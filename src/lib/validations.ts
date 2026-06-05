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

export const SendEmailSchema = z.object({
  jobId: z.string().min(1),
  resumeVersionId: z.string().min(1),
  subject: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(50000),
  recipientEmail: z.string().email(),
})

export const UploadResumeSchema = z.object({
  fileSize: z.number().max(10 * 1024 * 1024, 'Arquivo deve ter no máximo 10MB'),
  fileType: z.string().refine((v) => v === 'application/pdf', 'Apenas arquivos PDF são aceitos'),
})
