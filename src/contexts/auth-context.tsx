'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
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
  }
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  googleAccessToken: string | null
  login: () => Promise<User>
  logout: () => Promise<void>
  refreshGoogleToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  googleAccessToken: null,
  login: async () => { throw new Error('AuthProvider not mounted') },
  logout: async () => {},
  refreshGoogleToken: async () => null,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
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

    return () => {
      mountedRef.current = false
      unsubAuth()
    }
  }, [])

  const login = useCallback(async (): Promise<User> => {
    const authInstance = getAuthInstance()
    const dbInstance = getDbInstance()
    setError(null)
    try {
      const result = await signInWithPopup(authInstance, getGoogleProvider(), browserPopupRedirectResolver)
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
      if (err instanceof Error && 'code' in err && (err as unknown as { code: string }).code === 'auth/popup-closed-by-user') {
        return getAuthInstance().currentUser!
      }
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(message)
      toastError('Erro ao fazer login', message)
      throw err
    }
  }, [])

  const refreshGoogleToken = useCallback(async () => {
    const authInstance = getAuthInstance()
    try {
      const result = await signInWithPopup(authInstance, getGoogleProvider(), browserPopupRedirectResolver)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken || null
      if (token) {
        setGoogleAccessToken(token)
        saveAccessToken(token)
        toastSuccess('Conta Gmail reconectada')
      }
      return token
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as unknown as { code: string }).code === 'auth/popup-closed-by-user') {
        return null
      }
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout, googleAccessToken, refreshGoogleToken }}>
      {children}
    </AuthContext.Provider>
  )
}
