/** Server-side API client. Uses Clerk auth() to get the session token. */

import { auth } from "@clerk/nextjs/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

async function getAuthHeaders() {
  const session = await auth()
  const token = session?.getToken ? await session.getToken() : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
}
