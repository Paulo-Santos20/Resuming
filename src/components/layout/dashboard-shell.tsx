'use client'

import { useEffect } from 'react'
import { Sidebar } from './sidebar'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth()
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen, initDarkMode, toggleSidebar } = useUIStore()

  useEffect(() => {
    initDarkMode()
  }, [initDarkMode])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[--color-background]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--color-primary] border-t-transparent" />
          <p className="text-sm text-[--color-muted-foreground]">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="flex h-screen overflow-hidden bg-[--color-background]">
      {/* Desktop sidebar */}
      <Sidebar
        onLogout={logout}
        userName={profile.name}
        userEmail={profile.email}
      />

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <Sidebar
          mobile
          onLogout={logout}
          userName={profile.name}
          userEmail={profile.email}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[--color-border] bg-[--color-background]/80 backdrop-blur-sm px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--color-primary] text-[--color-primary-foreground] font-display font-bold text-sm">
            R
          </div>
          <span className="font-display font-semibold text-sm">Resume React</span>
        </div>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
