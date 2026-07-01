"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

type Role = "admin" | "shopkeeper" | "customer"

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: React.ReactNode
}) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session?.user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    if (fallback) return <>{fallback}</>
    redirect("/dashboard")
  }

  return <>{children}</>
}

export function useRole() {
  const { data: session } = useSession()
  return {
    role: session?.user?.role as Role | undefined,
    isAdmin: session?.user?.role === "admin",
    isShopkeeper: session?.user?.role === "shopkeeper",
    isCustomer: session?.user?.role === "customer",
  }
}
