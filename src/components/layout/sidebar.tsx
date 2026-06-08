'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
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
  ChevronRight,
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
  photoURL?: string | null
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ onLogout, userName, userEmail, photoURL, mobile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, toggleDarkMode, darkMode } = useUIStore()
  const collapsed = !sidebarOpen && !mobile
  const initial = userName?.charAt(0)?.toUpperCase() || '?'
  const sidebarRef = useRef<HTMLElement>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobile && onClose) {
      onClose()
    }
  }, [mobile, onClose])

  useEffect(() => {
    if (!mobile) return
    const el = sidebarRef.current
    if (!el) return
    el.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobile, handleKeyDown])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const UserAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeMap = { sm: 28, md: 36, lg: 40 }
    const px = sizeMap[size]
    const [imgError, setImgError] = useState(false)

    useEffect(() => {
      setImgError(false)
    }, [photoURL])

    if (photoURL && !imgError) {
      return (
        <div
          className="shrink-0 rounded-full overflow-hidden"
          style={{ width: px, height: px, minWidth: px, minHeight: px }}
        >
          <img
            src={photoURL}
            alt={userName}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )
    }

    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-accent text-[--color-accent-foreground] font-bold shadow-sm"
        style={{ width: px, height: px, minWidth: px, minHeight: px }}
      >
        <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm')}>{initial}</span>
      </div>
    )
  }

  const sidebarContent = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={cn(
          'flex items-center shrink-0 border-b border-border h-16',
          collapsed ? 'justify-center px-0.5' : 'justify-between px-3'
        )}>
          {collapsed ? (
            <div className="flex items-center gap-px">
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-display font-bold h-7 w-7 text-xs cursor-pointer hover:opacity-90 transition-opacity"
                title="Expandir menu"
              >
                R
              </button>
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-5 w-5 text-muted-foreground hover:text-foreground transition-colors rounded"
                title="Expandir menu"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display font-bold h-9 w-9 text-base">
                  R
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-sm truncate text-foreground">Resume React</h2>
                  <p className="text-xs text-muted-foreground truncate leading-tight">Currículos inteligentes</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Recolher menu" className="shrink-0 -mr-1">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={cn(
          'flex-1 space-y-0.5 px-2 py-4',
          collapsed ? 'overflow-hidden' : 'overflow-y-auto'
        )} aria-label="Navegação principal">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const hovered = hoveredItem === item.href
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  onClick={() => { isMobile && onClose?.() }}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    collapsed && 'justify-center px-2',
                    active
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )}
                  title={(collapsed || isMobile) ? item.label : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent" />
                  )}
                  <div className={cn(
                    'flex items-center justify-center shrink-0 transition-transform duration-200',
                    hovered && !active && 'scale-110',
                    active && 'scale-105'
                  )}>
                    <item.icon className={cn(
                      'h-[18px] w-[18px] transition-colors duration-200',
                      active ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'
                    )} />
                  </div>
                  {!collapsed && (
                    <span className="transition-colors duration-200 truncate">{item.label}</span>
                  )}
                </Link>

                {collapsed && (
                  <div className={cn(
                    'absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50',
                    'px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap',
                    'bg-foreground text-background shadow-lg',
                    'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                    'transition-all duration-150'
                  )}>
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border">
          {/* User */}
          <div className={cn(
            'flex items-center gap-3 rounded-lg mx-3 mt-3 p-2.5',
            collapsed ? 'justify-center' : 'bg-secondary'
          )}>
            <UserAvatar size={collapsed ? 'sm' : 'lg'} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{userName || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={cn(
            'p-3',
            collapsed && 'flex flex-col items-center gap-1'
          )}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={toggleDarkMode} title={darkMode ? 'Modo claro' : 'Modo escuro'}>
              {darkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={onLogout} title="Sair">
              <LogOut className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop */}
      {!mobile && (
        <aside
          ref={sidebarRef}
          role="navigation"
          aria-label="Menu lateral"
          className={cn(
            'hidden lg:flex h-full flex-col',
            'bg-card border-r border-border',
            'transition-all duration-300 ease-in-out',
            sidebarOpen ? 'w-64' : 'w-16'
          )}
        >
          {sidebarContent('desktop')}
        </aside>
      )}

      {/* Mobile */}
      {mobile && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
            role="presentation"
          />
          <aside
            ref={sidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-xl outline-none"
          >
            {sidebarContent('mobile')}
          </aside>
        </>
      )}
    </>
  )
}
