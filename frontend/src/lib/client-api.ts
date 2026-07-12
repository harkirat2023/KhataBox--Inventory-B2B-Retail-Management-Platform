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

export function authHeaders(): Record<string, string> {
  const token = getCookie("khatabox_token") || getCookie("admin_token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const clientApi = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async delete(path: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: authHeaders() })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
  },
}

function setCookie(name: string, value: string, maxAgeDays = 1) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${value}; Path=/; SameSite=Lax${secure}; Max-Age=${maxAgeDays * 86400}`
}

export function setAuthToken(token: string) {
  setCookie("khatabox_token", token)
}

export function clearAuthToken() {
  document.cookie = "khatabox_token=; Path=/; Max-Age=0"
  document.cookie = "admin_token=; Path=/; Max-Age=0"
}
