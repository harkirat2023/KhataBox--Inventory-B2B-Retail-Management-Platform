import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { apiGet } from "./api"

type Role = "admin" | "shopkeeper" | "customer"

export async function requireAuth(roles?: Role[]) {
  const session = await auth()

  if (!session?.userId) {
    redirect("/login")
  }

  if (roles) {
    try {
      const user = await apiGet<{ role: string }>("/api/v1/auth/me")
      if (!roles.includes(user.role as Role)) {
        redirect("/dashboard")
      }
    } catch {
      redirect("/login")
    }
  }

  return session
}

export const rolePermissions: Record<Role, string[]> = {
  admin: ["users", "analytics", "audit"],
  shopkeeper: ["inventory", "billing", "orders", "suppliers", "forecasting", "reports"],
  customer: ["catalog", "orders", "invoices"],
}
