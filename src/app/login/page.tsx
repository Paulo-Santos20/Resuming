'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { GoogleLoginButton } from '@/components/auth/google-login-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { usePageTitle } from '@/hooks/use-page-title'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  usePageTitle('Login')

  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingSpinner size="lg" label="Carregando…" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white font-display font-bold text-xl">
            R
          </div>
          <span className="font-display font-semibold text-2xl">Resuming</span>
        </div>
        <div className="w-full flex justify-center">
          <GoogleLoginButton />
        </div>
      </div>
    </div>
  )
}
