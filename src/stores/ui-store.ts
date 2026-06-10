'use client'

import { create } from 'zustand'

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem('mr-dark-mode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function getInitialSidebarOpen(): boolean {
  return true
}

function applyDarkMode(dark: boolean) {
  if (typeof document === 'undefined') return
  try {
    document.documentElement.classList.toggle('dark', dark)
  } catch {
    // dom unavailable
  }
}

interface UIState {
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  darkMode: boolean
  initDarkMode: () => void
  initSidebarOpen: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  darkMode: false,

  initDarkMode: () => {
    const dark = getInitialDarkMode()
    applyDarkMode(dark)
    set({ darkMode: dark })
  },

  initSidebarOpen: () => {
    const open = getInitialSidebarOpen()
    set({ sidebarOpen: open })
  },

  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      try {
        localStorage.setItem('mr-dark-mode', String(next))
      } catch {
        // localStorage unavailable
      }
      applyDarkMode(next)
      return { darkMode: next }
    }),
}))
