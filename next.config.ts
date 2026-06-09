import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'firebase-admin'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@tiptap/react',
      '@tiptap/starter-kit',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
