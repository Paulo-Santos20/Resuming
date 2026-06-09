import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Resume React — Currículos Inteligentes',
  description: 'Crie currículos otimizados para cada vaga com IA',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Resume React',
    description: 'Crie currículos otimizados para cada vaga com IA',
    siteName: 'Resume React',
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
}

const DARK_MODE_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('mr-dark-mode');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'true' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})()
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="preload" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=dm-sans@400,500&display=swap" as="style" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=dm-sans@400,500&display=swap" media="print" />
        <Script id="font-swap" strategy="afterInteractive">
          {`document.querySelector('link[href*="fontshare"]').media='all'`}
        </Script>
        <noscript><link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=dm-sans@400,500&display=swap" /></noscript>
        <Script id="dark-mode" strategy="beforeInteractive">
          {DARK_MODE_SCRIPT}
        </Script>
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  )
}
