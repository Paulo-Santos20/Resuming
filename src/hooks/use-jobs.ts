'use client'

import { useState, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  limit,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getDbInstance, getStorageInstance, getAuthInstance } from '@/lib/firebase'
import { toastSuccess, toastError } from '@/lib/toast'
import type { JobDescription } from '@/types'

export function useJobs(userId: string | undefined) {
  const [jobs, setJobs] = useState<JobDescription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    if (!userId) return
    const dbInstance = getDbInstance()
    setError(null)
    setLoading(true)
    try {
      const q = query(
        collection(dbInstance, 'users', userId, 'jobs'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      const snap = await getDocs(q)
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobDescription)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vagas')
    } finally {
      setLoading(false)
    }
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

        await fetchJobs()
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
    [userId, fetchJobs]
  )

  const markAsSent = useCallback(
    async (jobId: string) => {
      if (!userId) return
      try {
        await updateDoc(doc(getDbInstance(), 'users', userId, 'jobs', jobId), {
          status: 'sent',
          emailSentAt: Date.now(),
        })
        await fetchJobs()
        toastSuccess('Email enviado', 'Candidatura registrada como enviada')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar vaga'
        setError(message)
        toastError('Erro ao enviar', message)
      }
    },
    [userId, fetchJobs]
  )

  return { jobs, loading, error, fetchJobs, createJob, markAsSent }
}
