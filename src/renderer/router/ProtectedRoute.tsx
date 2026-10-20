import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Spinner from '@/components/ui/Spinner'

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, status } = useAuthStore((s) => ({ isAuthenticated: s.isAuthenticated, status: s.status }))
  if (status === 'idle' || status === 'hydrating') {
    return <div className="min-h-screen grid place-items-center bg-background-primary"><Spinner /></div>
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
