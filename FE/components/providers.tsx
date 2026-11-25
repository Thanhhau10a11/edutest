'use client'

import React, { useEffect } from 'react'
import { ThemeProvider } from '@/lib/theme-context'
import { AuthProvider } from '@/lib/auth-context'
import AIChatboxWidget from '@/components/modules/AIChatboxWidget'

/**
 * Automatically locks document body scroll whenever any modal overlay is present in the DOM,
 * and restores it as soon as the modal is closed.
 */
function ModalScrollLockManager() {
  useEffect(() => {
    const updateLock = () => {
      const hasOverlay = !!document.querySelector('.result-overlay, .modal-overlay')
      if (hasOverlay) {
        document.documentElement.classList.add('modal-open')
        document.body.classList.add('modal-open')
        document.body.style.overflow = 'hidden'
      } else {
        document.documentElement.classList.remove('modal-open')
        document.body.classList.remove('modal-open')
        document.body.style.overflow = ''
      }
    }

    updateLock()
    const observer = new MutationObserver(updateLock)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('modal-open')
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
    }
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalScrollLockManager />
        {children}
        <AIChatboxWidget />
      </AuthProvider>
    </ThemeProvider>
  )
}
