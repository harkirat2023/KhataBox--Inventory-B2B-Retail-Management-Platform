import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

type Role = "admin" | "shopkeeper" | "customer"

async function validateToken(token: string): Promise<{ role: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function requireAuth(roles?: Role[]) {
  const cookieStore = await cookies()
  const token = cookieStore.get("khatabox_token")?.value || cookieStore.get("admin_token")?.value

  if (!token) {
    redirect("/login")
  }

  const user = await validateToken(token)
  if (!user) {
    redirect("/login")
  }

  if (roles && !roles.includes(user.role as Role)) {
    redirect("/dashboard")
  }

  return user
}

export const rolePermissions: Record<Role, string[]> = {
  admin: ["users", "analytics", "audit"],
  shopkeeper: ["inventory", "billing", "orders", "suppliers", "forecasting", "reports"],
  customer: ["catalog", "orders", "invoices"],
}
