"use client"

import { useUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { clientApi } from "@/lib/client-api"
import { useEffect, useState } from "react"

type Role = "admin" | "shopkeeper" | "customer"

interface DbUser {
  id: number
  clerk_id: string
  email: string
  name: string
  role: string
  is_active: boolean
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: React.ReactNode
}) {
  const { user, isLoaded, isSignedIn } = useUser()
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      redirect("/login")
      return
    }
    // Fetch user from backend
    const token = user?.id // Clerk user ID
    clientApi.get<DbUser>("/api/v1/auth/me")
      .then(setDbUser)
      .catch(() => redirect("/login"))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, user])

  if (!isLoaded || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!dbUser) {
    redirect("/login")
  }

  if (!allowedRoles.includes(dbUser.role as Role)) {
    if (fallback) return <>{fallback}</>
    redirect("/dashboard")
  }

  return <>{children}</>
}

export function useRole() {
  const { user, isLoaded } = useUser()
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      setLoading(false)
      return
    }
    clientApi.get<DbUser>("/api/v1/auth/me")
      .then(setDbUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoaded, user])

  return {
    role: dbUser?.role as Role | undefined,
    isAdmin: dbUser?.role === "admin",
    isShopkeeper: dbUser?.role === "shopkeeper",
    isCustomer: dbUser?.role === "customer",
    loading,
  }
}
