import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Resume React — Currículos Inteligentes',
  description: 'Crie currículos otimizados para cada vaga com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
