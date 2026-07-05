import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

type Role = "admin" | "shopkeeper" | "customer"

export async function requireAuth(roles?: Role[]) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const userRole = session.user.role as Role

  if (roles && !roles.includes(userRole)) {
    // Break infinite loop: redirect customer to /customer, others to /login
    if (userRole === "customer") {
      redirect("/customer")
    }
    redirect("/login")
  }

  return session
}

export const rolePermissions: Record<Role, string[]> = {
  admin: ["users", "analytics", "audit"],
  shopkeeper: ["inventory", "billing", "orders", "suppliers", "forecasting", "reports"],
  customer: ["catalog", "orders", "invoices"],
}
