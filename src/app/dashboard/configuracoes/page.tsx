'use client'

import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { LogOut, Trash2, Moon, Sun } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { usePageTitle } from '@/hooks/use-page-title'
import { useState } from 'react'

export default function ConfiguracoesPage() {
  const { profile, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useUIStore()
  const [logoutOpen, setLogoutOpen] = useState(false)

  usePageTitle('Configurações')

  const handleLogout = () => {
    logout()
    setLogoutOpen(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua conta e preferências
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Suas informações de conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile?.photoURL ? <AvatarImage src={profile.photoURL} /> : null}
              <AvatarFallback className="text-lg">
                {profile?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display font-semibold text-lg">{profile?.name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Alternar entre tema claro e escuro</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={toggleDarkMode}
          >
            {darkMode ? (
              <Sun className="h-4 w-4 mr-2" />
            ) : (
              <Moon className="h-4 w-4 mr-2" />
            )}
            {darkMode ? 'Modo claro' : 'Modo escuro'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <CardDescription>Ações da conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive-text hover:bg-destructive-bg"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
          <ConfirmDialog
            open={logoutOpen}
            onOpenChange={setLogoutOpen}
            onConfirm={handleLogout}
            title="Sair da conta"
            description="Tem certeza que deseja sair?"
            confirmLabel="Sair"
            variant="destructive"
          />
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            disabled
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir conta (em breve)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
