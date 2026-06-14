'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  limit,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getDbInstance, getStorageInstance, getAuthInstance } from '@/lib/firebase'
import { toastSuccess, toastError } from '@/lib/toast'
import { useProcessing } from '@/contexts/processing-context'
import type { Resume, ResumeVersion, ResumeData } from '@/types'

export function useResume(userId: string | undefined) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [versions, setVersions] = useState<ResumeVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumesRef = useRef<Resume[]>([])
  const processing = useProcessing()

  const fetchResumes = useCallback(async () => {
    if (!userId) return
    const dbInstance = getDbInstance()
    try {
      const q = query(
        collection(dbInstance, 'users', userId, 'resumes'),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resume))
      setResumes(data)
      resumesRef.current = data
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar currículos')
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    const dbInstance = getDbInstance()
    const q = query(
      collection(dbInstance, 'users', userId, 'resumes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resume))
        setResumes(data)
        resumesRef.current = data
        setLoading(false)
      },
      (err) => {
        console.error('[onSnapshot] error:', err)
        setError(err.message)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [userId])

  const uploadResume = useCallback(
    async (file: File) => {
      if (!userId) throw new Error('Usuário não autenticado')
      const dbInstance = getDbInstance()
      const storageInstance = getStorageInstance()
      setError(null)
      setLoading(true)
      try {
        const storagePath = `users/${userId}/resumes/${Date.now()}_${file.name}`
        const storageRef = ref(storageInstance, storagePath)
        await uploadBytes(storageRef, file)
        const downloadURL = await getDownloadURL(storageRef)

        const docRef = await addDoc(collection(dbInstance, 'users', userId, 'resumes'), {
          userId,
          originalFileName: file.name,
          storagePath,
          downloadURL,
          originalText: '',
          parsedData: null,
          status: 'processing',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        const idToken = await getAuthInstance().currentUser?.getIdToken()
        if (!idToken) throw new Error('Token de autenticação não disponível')

        processing.register(docRef.id, file.name)
        processInBackground(docRef.id, file.name, downloadURL, idToken, userId, processing)
        return docRef.id
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar currículo'
        setError(message)
        toastError('Erro ao enviar currículo', message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId, fetchResumes, processing.register]
  )

  const fetchVersions = useCallback(
    async (resumeId: string) => {
      if (!userId) return
      const dbInstance = getDbInstance()
      try {
        const q = query(
          collection(dbInstance, 'users', userId, 'resumes', resumeId, 'versions'),
          orderBy('createdAt', 'desc'),
          limit(1)
        )
        const snap = await getDocs(q)
        setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ResumeVersion)))
      } catch {
        console.error('Erro ao carregar versões')
      }
    },
    [userId]
  )

  const editResume = useCallback(
    async (
      resumeId: string,
      jobId: string,
      jobDescription: string,
      templateType: 'ats' | 'original' = 'ats',
      jobTitle: string = ''
    ) => {
      if (!userId) throw new Error('Usuário não autenticado')
      const resume = resumesRef.current.find((r) => r.id === resumeId)
      if (!resume?.parsedData) throw new Error('Currículo não processado ainda')

      setError(null)
      setLoading(true)
      try {
        const idToken = await getAuthInstance().currentUser?.getIdToken()
        if (!idToken) throw new Error('Token de autenticação não disponível')

        const response = await fetch('/api/python/edit-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            resumeData: resume.parsedData,
            jobDescription,
            templateType,
          }),
        })
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ error: 'Erro ao editar currículo' }))
          throw new Error(errBody.detail || errBody.error || 'Erro ao editar currículo')
        }
        const { html } = await response.json()

        const versionsRef = collection(getDbInstance(), 'users', userId, 'resumes', resumeId, 'versions')
        const existingSnap = await getDocs(query(versionsRef, orderBy('versionNumber', 'desc'), limit(1)))
        const nextVersion = existingSnap.docs.length > 0 ? (existingSnap.docs[0].data().versionNumber || 0) + 1 : 1

        await addDoc(versionsRef, {
          resumeId,
          jobId,
          jobTitle,
          content: html,
          templateType,
          versionNumber: nextVersion,
          createdAt: Date.now(),
        })

        await fetchVersions(resumeId)
        toastSuccess('Currículo editado', 'Versão otimizada gerada para a vaga')
        return html as string
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao editar currículo'
        setError(message)
        toastError('Erro ao editar currículo', message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId, fetchVersions]
  )

  const deleteResume = useCallback(async (resumeId: string) => {
    if (!userId) throw new Error('Usuário não autenticado')
    const dbInstance = getDbInstance()
    const storageInstance = getStorageInstance()
    setError(null)
    try {
      const resumeData = resumesRef.current.find((r) => r.id === resumeId)
      if (!resumeData) throw new Error('Currículo não encontrado')

      if (resumeData.storagePath) {
        const storageRef = ref(storageInstance, resumeData.storagePath)
        await deleteObject(storageRef)
      }

      const versionsSnap = await getDocs(
        collection(dbInstance, 'users', userId, 'resumes', resumeId, 'versions')
      )
      const batch = writeBatch(dbInstance)
      versionsSnap.docs.forEach((v) => {
        batch.delete(doc(dbInstance, 'users', userId, 'resumes', resumeId, 'versions', v.id))
      })
      batch.delete(doc(dbInstance, 'users', userId, 'resumes', resumeId))
      await batch.commit()

      setResumes((prev) => prev.filter((r) => r.id !== resumeId))
      resumesRef.current = resumesRef.current.filter((r) => r.id !== resumeId)
      toastSuccess('Currículo excluído')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir currículo'
      setError(message)
      toastError('Erro ao excluir currículo', message)
      throw err
    }
  }, [userId])

  return { resumes, versions, loading, error, fetchResumes, fetchVersions, uploadResume, editResume, deleteResume }
}

function guessName(fileName: string): string {
  const name = fileName
    .replace(/\.pdf$/i, '')
    .split(/[-_]/)[0]
    .trim()
  return name || 'Nome não detectado'
}

async function processInBackground(
  resumeId: string,
  originalFileName: string,
  downloadURL: string,
  idToken: string,
  uid: string,
  ctx: ReturnType<typeof useProcessing>,
) {
  const db = getDbInstance()
  const maxAttempts = 10

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    ctx.updateProgress(resumeId, 25 + Math.min(attempt * 7, 55))

    try {
      const response = await fetch('/api/python/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ fileUrl: downloadURL, uid }),
      })

      if (response.ok) {
        const { data }: { data: ResumeData } = await response.json()
        if (process.env.NODE_ENV === 'development') console.log('[processInBackground] Gemini data:', JSON.stringify(data, null, 2))
        ctx.updateProgress(resumeId, 90)

        await updateDoc(doc(db, 'users', uid, 'resumes', resumeId), {
          parsedData: data,
          status: 'completed',
          updatedAt: Date.now(),
        })

        const name = data.personal?.nome || guessName(originalFileName)
        const skillsCount = data.habilidades?.length ?? 0
        ctx.complete(resumeId, name, skillsCount)
        toastSuccess('Currículo processado', `${name} — ${skillsCount} habilidades`)
        return
      }

      const body = await response.json().catch(() => ({}))
      const detail = body.detail || body.error || ''

      if (response.status === 422) {
        ctx.fail(resumeId, detail || 'Não foi possível extrair dados')
        await updateDoc(doc(db, 'users', uid, 'resumes', resumeId), {
          status: 'error',
          error: detail || 'Falha na extração',
        })
        toastError('Erro no processamento', detail || 'Arquivo inválido')
        return
      }

      if (attempt >= maxAttempts - 1) {
        ctx.fail(resumeId, 'Serviço temporariamente indisponível')
        await updateDoc(doc(db, 'users', uid, 'resumes', resumeId), {
          status: 'error',
          error: 'Tentativas esgotadas',
        })
        toastError('Processamento falhou', 'Tentativas esgotadas após alta demanda')
        return
      }

      await tickProgress(ctx, resumeId, 30 + attempt * 5, 60 + attempt * 3, 5000)
    } catch (err) {
      if (attempt >= maxAttempts - 1) {
        const msg = err instanceof Error ? err.message : 'Erro no processamento'
        ctx.fail(resumeId, msg)
        await updateDoc(doc(db, 'users', uid, 'resumes', resumeId), {
          status: 'error',
          error: msg,
        })
        toastError('Processamento falhou', msg)
        return
      }
      await tickProgress(ctx, resumeId, 30 + attempt * 5, 60 + attempt * 3, 5000)
    }
  }
}

async function tickProgress(
  ctx: ReturnType<typeof useProcessing>,
  id: string,
  from: number,
  to: number,
  duration: number,
) {
  const steps = 5
  const stepSize = (to - from) / steps
  const delay = duration / steps
  for (let i = 0; i < steps; i++) {
    ctx.updateProgress(id, from + stepSize * (i + 1))
    await new Promise((r) => setTimeout(r, delay))
  }
}
