/** Client-side API client (for use in Client Components). Uses useSession() from NextAuth. */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

interface SessionWithToken {
  access_token?: string
}

export async function getToken(): Promise<string | null> {
  try {
    const { getSession } = await import("next-auth/react")
    const session = await getSession()
    return (session as SessionWithToken | null)?.access_token || null
  } catch {
    return null
  }
}

async function headers(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
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

export const clientApi = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: await headers() })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: await headers(), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers: await headers(), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PATCH", headers: await headers(), body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
    return res.json()
  },
  async delete(path: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: await headers() })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(extractError(text))
    }
  },
}
