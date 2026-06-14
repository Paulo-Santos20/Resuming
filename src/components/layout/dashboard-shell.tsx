'use client'

import { useEffect } from 'react'
import { Sidebar } from './sidebar'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Menu } from 'lucide-react'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth()
  const router = useRouter()
  const { mobileSidebarOpen, setMobileSidebarOpen, initDarkMode, initSidebarOpen, toggleMobileSidebar } = useUIStore()

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
        <div className="glass-card rounded-xl flex flex-col items-center gap-4 px-8 py-12">
          <LoadingSpinner size="lg" label="Carregando…" />
        </div>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onLogout={logout}
        userName={profile.name}
        userEmail={profile.email}
        photoURL={profile.photoURL}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-border/50 px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleMobileSidebar} aria-label="Abrir menu">
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
