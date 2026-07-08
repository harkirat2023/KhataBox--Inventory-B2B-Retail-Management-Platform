/** Client-side API client. Auto-reads clerk_jwt or admin_token cookie for auth. */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function extractError(text: string): string {
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed.detail)) {
      return parsed.detail.map((d: { loc?: string[]; msg?: string }) =>
        `${(d.loc ?? []).join(".")}: ${d.msg}`
      ).join("; ")
    }
    if (typeof parsed.detail === "string") return parsed.detail
    if (parsed.message) return parsed.message
  } catch { /* noop */ }
  return text
}

function headers(clerkToken?: string): Record<string, string> {
  const token = clerkToken || getCookie("clerk_jwt") || getCookie("admin_token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const clientApi = {
  async get<T>(path: string, clerkToken?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: headers(clerkToken) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async post<T>(path: string, body: unknown, clerkToken?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: headers(clerkToken), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async put<T>(path: string, body: unknown, clerkToken?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers: headers(clerkToken), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async patch<T>(path: string, body: unknown, clerkToken?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PATCH", headers: headers(clerkToken), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async delete(path: string, clerkToken?: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: headers(clerkToken) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
  },
}
