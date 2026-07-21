'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getDbInstance, getStorageInstance, getAuthInstance } from '@/lib/firebase'
import { toastSuccess, toastError } from '@/lib/toast'
import type { JobDescription } from '@/types'

export function useJobs(userId: string | undefined) {
  const [jobs, setJobs] = useState<JobDescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setJobs([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const dbInstance = getDbInstance()
    const q = query(
      collection(dbInstance, 'users', userId, 'jobs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobDescription)))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Jobs snapshot error:', err)
        setError('Erro ao carregar vagas')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  const createJob = useCallback(
    async (title: string, description: string, photoFile?: File) => {
      if (!userId) throw new Error('Usuário não autenticado')
      const dbInstance = getDbInstance()
      const storageInstance = getStorageInstance()
      setError(null)
      setLoading(true)
      try {
        let photoPath: string | null = null
        let finalDescription = description

        if (photoFile) {
          const path = `users/${userId}/jobs/${Date.now()}_${photoFile.name}`
          const storageRef = ref(storageInstance, path)
          await uploadBytes(storageRef, photoFile)
          photoPath = await getDownloadURL(storageRef)

          try {
            const ocrIdToken = await getAuthInstance().currentUser?.getIdToken()
            const ocrResponse = await fetch('/api/python/ocr-job', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ocrIdToken}` },
              body: JSON.stringify({ photoUrl: photoPath }),
            })
            if (ocrResponse.ok) {
              const { data, rawText } = await ocrResponse.json()
              finalDescription = data?.descricao || rawText || description
            }
          } catch (ocrErr) {
            console.error('OCR error:', ocrErr)
            toastError('Foto não processada', 'Não foi possível extrair texto da foto. A vaga foi criada sem descrição.')
          }
        }

        const docRef = await addDoc(collection(dbInstance, 'users', userId, 'jobs'), {
          userId,
          title,
          description: finalDescription,
          source: photoFile ? 'photo' : 'text',
          photoPath,
          status: 'pending',
          emailSentAt: null,
          createdAt: Date.now(),
        })

        toastSuccess('Vaga criada', `${title} foi adicionada com sucesso`)
        return docRef.id
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao criar vaga'
        setError(message)
        toastError('Erro ao criar vaga', message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  const deleteJob = useCallback(
    async (jobId: string) => {
      if (!userId) return
      try {
        await deleteDoc(doc(getDbInstance(), 'users', userId, 'jobs', jobId))
        toastSuccess('Vaga excluída', 'A vaga foi removida com sucesso')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir vaga'
        setError(message)
        toastError('Erro ao excluir', message)
      }
    },
    [userId]
  )

  const markAsSent = useCallback(
    async (jobId: string) => {
      if (!userId) return
      try {
        await updateDoc(doc(getDbInstance(), 'users', userId, 'jobs', jobId), {
          status: 'sent',
          emailSentAt: Date.now(),
        })
        toastSuccess('Email enviado', 'Candidatura registrada como enviada')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar vaga'
        setError(message)
        toastError('Erro ao enviar', message)
      }
    },
    [userId]
  )

  return { jobs, loading, error, fetchJobs: undefined, createJob, deleteJob, markAsSent }
}
