"use client"

import { useState, useEffect, useCallback } from "react"
import { clientApi } from "@/lib/client-api"

export interface User {
  id: number
  email: string
  name: string
  role: string
  store_name: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi.get<User>("/api/v1/auth/me")
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, isLoaded: !loading, isSignedIn: !!user, refetch: fetchUser }
}
