'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { GoogleLoginButton } from '@/components/auth/google-login-button'

export default function Home() {
  const { user, loading, error } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[--color-surface]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--color-brand] border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    )
  }

  if (user) return null

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[--color-surface] p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 mx-auto">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="font-display text-xl font-bold">Erro de autenticação</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-brand] text-white font-display font-bold text-lg">
            R
          </div>
          <span className="font-display font-semibold text-xl">Resume React</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-bold tracking-tight">
              Currículos inteligentes para{' '}
              <span className="text-[--color-accent]">cada oportunidade</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Faça upload do seu currículo, cole a descrição da vaga e deixe a IA
              criar uma versão otimizada com regras ATS. Visualize, edite e envie
              por email em minutos.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <GoogleLoginButton />
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8">
            {[
              { icon: '📄', title: 'Upload PDF', desc: 'Seu currículo processado' },
              { icon: '🎯', title: 'Match com a vaga', desc: 'ATS + IA do Google' },
              { icon: '✉️', title: 'Envio por email', desc: 'Gmail integrado' },
            ].map((item) => (
              <div key={item.title} className="space-y-2">
                <div className="text-2xl">{item.icon}</div>
                <h3 className="font-display font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
