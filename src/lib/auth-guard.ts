import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

type Role = "admin" | "shopkeeper" | "customer"

export async function requireAuth(roles?: Role[]) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (roles && !roles.includes(session.user.role as Role)) {
    redirect("/dashboard")
  }

  return session
}

export const rolePermissions: Record<Role, string[]> = {
  admin: ["users", "analytics", "audit"],
  shopkeeper: ["inventory", "billing", "orders", "suppliers", "forecasting", "reports"],
  customer: ["catalog", "orders", "invoices"],
}
