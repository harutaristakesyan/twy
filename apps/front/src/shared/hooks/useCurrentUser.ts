import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/entities/user/api'
import type { CurrentUser } from '@/entities/user/types'

/**
 * Hook to fetch and access the current logged-in user
 * Caches the user data and provides loading state
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const userData = await getCurrentUser()
        setUser(userData)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch current user:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const refetch = async () => {
    try {
      setLoading(true)
      const userData = await getCurrentUser()
      setUser(userData)
      setError(null)
    } catch (err) {
      console.error('Failed to refetch current user:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, error, refetch }
}
