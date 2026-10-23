import React, { useEffect, useLayoutEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import useTheme from '@/hooks/useTheme'
import ReleaseNotesModal from '@/components/layout/ReleaseNotesModal'
import { useAuthStore } from '@/store/authStore'
import TitleBar from '@/components/layout/TitleBar'
import { isWebPlatform } from '@/platform/platform'

const App: React.FC = () => {
  useTheme()
  const initialize = useAuthStore((state) => state.initialize)
  useEffect(() => { void initialize() }, [initialize])
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--app-titlebar-height', isWebPlatform ? '0px' : '2.25rem')
    return () => { document.documentElement.style.removeProperty('--app-titlebar-height') }
  }, [])
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background-primary">
      {!isWebPlatform && <TitleBar />}
      <div className="min-h-0 flex-1">
        <RouterProvider router={router} />
      </div>
      <ReleaseNotesModal />
    </div>
  )
}

export default App
