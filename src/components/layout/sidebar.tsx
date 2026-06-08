'use client'

import { useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Briefcase,
  Settings,
  LogOut,
  FileUser,
  Moon,
  Sun,
  ChevronLeft,
  X,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: FileUser },
  { href: '/dashboard/curriculo', label: 'Currículo', icon: FileText },
  { href: '/dashboard/vagas', label: 'Vagas', icon: Briefcase },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  onLogout: () => void
  userName: string
  userEmail: string
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ onLogout, userName, userEmail, mobile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, toggleDarkMode, darkMode } = useUIStore()
  const collapsed = !sidebarOpen && !mobile
  const initial = userName?.charAt(0)?.toUpperCase() || '?'
  const sidebarRef = useRef<HTMLElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobile && onClose) {
      onClose()
    }
    if (e.key === 'Escape' && !mobile && collapsed && sidebarOpen) {
      toggleSidebar()
    }
  }, [mobile, onClose, collapsed, sidebarOpen, toggleSidebar])

  useEffect(() => {
    if (!mobile) return
    const el = sidebarRef.current
    if (!el) return
    el.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobile, handleKeyDown])

  return (
    <>
      {/* Desktop */}
      {!mobile && (
        <aside
          ref={sidebarRef}
          role="navigation"
          aria-label="Menu lateral"
          className={cn(
            'hidden lg:flex h-full flex-col border-r border-[--color-border] bg-[--color-card] relative',
            'transition-all duration-300 ease-in-out',
            sidebarOpen ? 'w-64' : 'w-16'
          )}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center border-b border-[--color-border] shrink-0',
            sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'
          )}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-3 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--color-primary] text-[--color-primary-foreground] font-display font-bold text-lg">
                    R
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold text-sm truncate">Resume React</h2>
                    <p className="text-xs text-[--color-muted-foreground] truncate">Currículos inteligentes</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Recolher menu">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Expandir menu" className="my-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary] text-[--color-primary-foreground] font-display font-bold text-lg">
                  R
                </div>
              </Button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4" role="menubar" aria-label="Navegação principal">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[--color-primary] text-[--color-primary-foreground]'
                      : 'text-[--color-muted-foreground] hover:bg-[--color-secondary] hover:text-[--color-primary]',
                    collapsed && 'justify-center px-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn('transition-opacity duration-200', collapsed && 'hidden')}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-[--color-border] p-3 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-[--color-muted-foreground]',
                collapsed ? 'justify-center px-0' : 'justify-start'
              )}
              onClick={toggleDarkMode}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              <span className={cn('ml-2 transition-opacity duration-200', collapsed && 'hidden')}>
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            </Button>

            <div className={cn(
              'flex items-center gap-3 px-1',
              collapsed && 'justify-center'
            )}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[--color-accent] text-[--color-accent-foreground] text-xs font-bold">
                {initial}
              </div>
              <div className={cn('flex-1 min-w-0 transition-opacity duration-200', collapsed && 'hidden')}>
                <p className="text-sm font-medium truncate text-[--color-foreground]">{userName || 'Usuário'}</p>
                <p className="text-xs text-[--color-muted-foreground] truncate">{userEmail}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-[--color-muted-foreground]',
                collapsed ? 'justify-center px-0' : 'justify-start'
              )}
              onClick={onLogout}
              title="Sair"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn('ml-2 transition-opacity duration-200', collapsed && 'hidden')}>Sair</span>
            </Button>
          </div>
        </aside>
      )}

      {/* Mobile */}
      {mobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
          />
          <aside
            ref={sidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-[--color-card] shadow-xl outline-none"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary] text-[--color-primary-foreground] font-display font-bold text-lg">
                    R
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-sm">Resume React</h2>
                    <p className="text-xs text-[--color-muted-foreground]">Currículos inteligentes</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Nav */}
              <nav className="flex-1 space-y-1 px-3 py-4" role="menubar" aria-label="Navegação principal">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[--color-primary] text-[--color-primary-foreground]'
                          : 'text-[--color-muted-foreground] hover:bg-[--color-secondary] hover:text-[--color-primary]'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Bottom */}
              <div className="border-t border-[--color-border] p-3 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-[--color-muted-foreground]"
                  onClick={toggleDarkMode}
                >
                  {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                  {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </Button>
                <div className="flex items-center gap-3 px-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[--color-accent] text-[--color-accent-foreground] text-xs font-bold">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[--color-foreground]">{userName || 'Usuário'}</p>
                    <p className="text-xs text-[--color-muted-foreground] truncate">{userEmail}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-[--color-muted-foreground]"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
