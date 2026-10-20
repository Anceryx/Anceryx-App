import React, { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import useTheme from '@/hooks/useTheme'
import ReleaseNotesModal from '@/components/layout/ReleaseNotesModal'
import { useAuthStore } from '@/store/authStore'

const App: React.FC = () => {
  useTheme()
  const initialize = useAuthStore((state) => state.initialize)
  useEffect(() => { void initialize() }, [initialize])
  return (
    <>
      <RouterProvider router={router} />
      <ReleaseNotesModal />
    </>
  )
}

export default App
