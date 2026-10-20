import { useState } from 'react'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'

const useAuth = () => {
  const store = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const withLoading = async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    try { return await operation() } finally { setIsLoading(false) }
  }

  return {
    ...store,
    login: (login: string, password: string) => withLoading(() => store.login(login, password)),
    completeMfa: (challengeToken: string, code: string) => withLoading(() => store.completeMfa(challengeToken, code)),
    forgotPassword: (email: string) => withLoading(() => authApi.forgotPassword(email)),
    isLoading,
  }
}

export default useAuth
