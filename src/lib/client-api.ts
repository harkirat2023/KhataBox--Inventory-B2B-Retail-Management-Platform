const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface SessionWithToken {
  access_token?: string
}

async function getToken(): Promise<string | null> {
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

export const clientApi = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: await headers() })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: await headers(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers: await headers(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "PATCH", headers: await headers(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  async delete(path: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: await headers() })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
  },
}
