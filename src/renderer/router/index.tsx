import React from 'react'
import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import { ProtectedRoute } from './ProtectedRoute'
import BillingResultPage from '@/pages/BillingResultPage'
import WebOAuthCallbackPage from '@/pages/WebOAuthCallbackPage'
import WebDeepLinkPage from './WebDeepLinkPage'

const routes = [
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
    path: '/auth/callback',
    element: <WebOAuthCallbackPage />
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
  ...['posts/:postId', 'foruns/:forumId', 'perfil/:username', 'profile/:username', 'invite/:token'].map((path) => ({
    path: `/${path}`,
    element: <ProtectedRoute />,
    children: [{ index: true, element: <WebDeepLinkPage /> }],
  })),
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]

export const router = import.meta.env.VITE_ANCERYX_PLATFORM === 'web'
  ? createBrowserRouter(routes)
  : createHashRouter(routes)
