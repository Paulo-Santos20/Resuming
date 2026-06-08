'use client'

import { useState, useCallback, useRef } from 'react'
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
import type { Resume, ResumeVersion, ResumeData } from '@/types'

export function useResume(userId: string | undefined) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [versions, setVersions] = useState<ResumeVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumesRef = useRef<Resume[]>([])

  const fetchResumes = useCallback(async () => {
    if (!userId) return
    const dbInstance = getDbInstance()
    setError(null)
    setLoading(true)
    try {
      const q = query(
        collection(dbInstance, 'users', userId, 'resumes'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resume))
      setResumes(data)
      resumesRef.current = data
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar currículos')
    } finally {
      setLoading(false)
    }
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
          originalFileName: file.name,
          storagePath,
          downloadURL,
          originalText: '',
          parsedData: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        const idToken = await getAuthInstance().currentUser?.getIdToken()
        if (!idToken) throw new Error('Token de autenticação não disponível')

        const response = await fetch('/api/python/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ fileUrl: downloadURL, uid: userId }),
        })

        if (!response.ok) throw new Error('Erro ao processar currículo')

        const { data }: { data: ResumeData } = await response.json()

        await updateDoc(doc(dbInstance, 'users', userId, 'resumes', docRef.id), {
          parsedData: data,
          updatedAt: Date.now(),
        })

        await fetchResumes()
        toastSuccess('Currículo enviado', `${file.name} foi processado com sucesso`)
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
    [userId, fetchResumes]
  )

  const fetchVersions = useCallback(
    async (resumeId: string) => {
      if (!userId) return
      const dbInstance = getDbInstance()
      try {
        const q = query(
          collection(dbInstance, 'users', userId, 'resumes', resumeId, 'versions'),
          orderBy('createdAt', 'desc')
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
        if (!response.ok) throw new Error('Erro ao editar currículo')
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

  return { resumes, versions, loading, error, fetchResumes, fetchVersions, uploadResume, editResume }
}
