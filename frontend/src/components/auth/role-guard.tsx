"use client"

import { useUser } from "@/hooks/use-user"
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
  const { user, isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isSignedIn || !user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(user.role as Role)) {
    if (fallback) return <>{fallback}</>
    if (user.role === "customer") redirect("/customer")
    if (user.role === "admin") redirect("/admin/users")
    redirect("/dashboard")
  }

  return <>{children}</>
}

export function useRole() {
  const { user, isLoaded } = useUser()

  return {
    role: user?.role as Role | undefined,
    isAdmin: user?.role === "admin",
    isShopkeeper: user?.role === "shopkeeper",
    isCustomer: user?.role === "customer",
    loading: !isLoaded,
  }
}
