'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  GoogleAuthProvider,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { getAuthInstance, getDbInstance, getGoogleProvider } from '@/lib/firebase'
import type { UserProfile } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const authInstance = getAuthInstance()
    const dbInstance = getDbInstance()
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const docRef = doc(dbInstance, 'users', firebaseUser.uid)
          const snap = await getDoc(docRef)
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao carregar perfil'
          setError(message)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async () => {
    const authInstance = getAuthInstance()
    const dbInstance = getDbInstance()
    setError(null)
    try {
      const result = await signInWithPopup(authInstance, getGoogleProvider())
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken)
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
      return result.user
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(message)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(getAuthInstance())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao sair'
      setError(message)
    }
    setGoogleAccessToken(null)
    setProfile(null)
    setUser(null)
  }, [])

  return { user, profile, loading, error, login, logout, googleAccessToken }
}
