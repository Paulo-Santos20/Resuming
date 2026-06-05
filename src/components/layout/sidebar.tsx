'use client'

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
} from 'lucide-react'

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
}

export function Sidebar({ onLogout, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const initial = userName?.charAt(0)?.toUpperCase() || '?'

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-3 border-b p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-brand] text-white font-display font-bold text-lg">
          R
        </div>
        <div>
          <h2 className="font-display font-semibold text-sm">Resume React</h2>
          <p className="text-xs text-muted-foreground">Currículos inteligentes</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[--color-brand] text-white hover:bg-[--color-brand-light]'
                  : 'text-muted-foreground hover:bg-[--color-surface-alt] hover:text-[--color-brand]'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[--color-accent] text-white text-xs font-bold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
