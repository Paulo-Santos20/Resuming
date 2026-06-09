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
  const { sidebarOpen, setSidebarOpen, initDarkMode, initSidebarOpen, toggleSidebar } = useUIStore()

  useEffect(() => {
    initDarkMode()
  }, [initDarkMode])

  useEffect(() => {
    initSidebarOpen()
  }, [initSidebarOpen])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Carregando" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onLogout={logout}
        userName={profile.name}
        userEmail={profile.email}
        photoURL={profile.photoURL}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm">
            R
          </div>
          <span className="font-display font-semibold text-sm">Resuming</span>
        </div>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
