import React from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import { ProtectedRoute } from './ProtectedRoute'
import BillingResultPage from '@/pages/BillingResultPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      { path: 'billing/:result', element: <BillingResultPage /> }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
])
