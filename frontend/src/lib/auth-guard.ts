import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

type Role = "admin" | "shopkeeper" | "customer"

async function validateAdminToken(token: string): Promise<{ role: string } | null> {
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
  // If admin is allowed, try admin JWT cookie first
  if (!roles || roles.includes("admin")) {
    const cookieStore = await cookies()
    const adminToken = cookieStore.get("admin_token")?.value
    if (adminToken) {
      const user = await validateAdminToken(adminToken)
      if (user && user.role === "admin") return null
    }
  }

  // Fall back to Clerk auth (for shopkeeper / customer)
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

async function apiGet<T>(path: string): Promise<T> {
  const session = await auth()
  const token = session?.getToken ? await session.getToken() : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const rolePermissions: Record<Role, string[]> = {
  admin: ["users", "analytics", "audit"],
  shopkeeper: ["inventory", "billing", "orders", "suppliers", "forecasting", "reports"],
  customer: ["catalog", "orders", "invoices"],
}