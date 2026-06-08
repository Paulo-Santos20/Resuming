'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  User,
  GoogleAuthProvider,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { getAuthInstance, getDbInstance, getGoogleProvider } from '@/lib/firebase'
import { toastSuccess, toastError, toastInfo } from '@/lib/toast'
import type { UserProfile } from '@/types'

function loadAccessToken(): string | null {
  try {
    return sessionStorage.getItem('mr-google-token')
  } catch {
    return null
  }
}

function saveAccessToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem('mr-google-token', token)
    } else {
      sessionStorage.removeItem('mr-google-token')
    }
  } catch {
    // sessionStorage unavailable
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(loadAccessToken)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const authInstance = getAuthInstance()
    const dbInstance = getDbInstance()
    const unsubAuth = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (!mountedRef.current) return
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const docRef = doc(dbInstance, 'users', firebaseUser.uid)
          const snap = await getDoc(docRef)
          if (!mountedRef.current) return
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile)
          }
        } catch (err) {
          if (!mountedRef.current) return
          const message = err instanceof Error ? err.message : 'Erro ao carregar perfil'
          setError(message)
        }
      } else {
        setProfile(null)
        saveAccessToken(null)
        setGoogleAccessToken(null)
      }
      if (mountedRef.current) setLoading(false)
    })

    const unsubToken = onIdTokenChanged(authInstance, async (firebaseUser) => {
      if (!mountedRef.current) return
      if (firebaseUser) {
        setUser(firebaseUser)
        if (!mountedRef.current) return
      }
    })

    return () => {
      mountedRef.current = false
      unsubAuth()
      unsubToken()
    }
  }, [])

  const login = useCallback(async () => {
    const authInstance = getAuthInstance()
    const dbInstance = getDbInstance()
    setError(null)
    try {
      const result = await signInWithPopup(authInstance, getGoogleProvider())
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken || null
      if (token) {
        setGoogleAccessToken(token)
        saveAccessToken(token)
      }
      const { uid, email, displayName, photoURL } = result.user
      const userProfile: UserProfile = {
        uid,
        email: email || '',
        name: displayName || '',
        photoURL,
        createdAt: Date.now(),
      }
      await setDoc(doc(dbInstance, 'users', uid), userProfile, { merge: true })
      setProfile(userProfile)
      toastSuccess('Login realizado', `Bem-vindo, ${displayName || 'usuário'}!`)
      return result.user
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(message)
      toastError('Erro ao fazer login', message)
      throw err
    }
  }, [])

  const refreshGoogleToken = useCallback(async () => {
    const authInstance = getAuthInstance()
    try {
      const result = await signInWithPopup(authInstance, getGoogleProvider())
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken || null
      if (token) {
        setGoogleAccessToken(token)
        saveAccessToken(token)
        toastSuccess('Conta Gmail reconectada')
      }
      return token
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar Gmail'
      setError(message)
      toastError('Erro ao conectar Gmail', message)
      return null
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(getAuthInstance())
      toastInfo('Sessão encerrada')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao sair'
      setError(message)
      toastError('Erro ao sair', message)
    }
    saveAccessToken(null)
    setGoogleAccessToken(null)
    setProfile(null)
    setUser(null)
  }, [])

  return { user, profile, loading, error, login, logout, googleAccessToken, refreshGoogleToken }
}
