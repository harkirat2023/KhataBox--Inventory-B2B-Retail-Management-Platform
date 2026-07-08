"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { clientApi } from "./client-api"

export interface DbUser {
  id: number
  clerk_id: string
  email: string
  name: string
  role: string
  is_active: boolean
}

export function useDbUser() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setLoading(false); return }

    clientApi.get<DbUser>("/api/v1/auth/me")
      .then(setDbUser)
      .catch(() => setDbUser(null))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, user])

  return { dbUser, loading, isLoaded, isSignedIn }
}
