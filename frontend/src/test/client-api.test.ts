import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next-auth/react", () => ({
  getSession: vi.fn().mockResolvedValue({ access_token: "mock-token" }),
}))

import { clientApi } from "@/lib/client-api"

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe("clientApi.get", () => {
  it("calls fetch with GET and returns JSON", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: "ok" }) })
    const result = await clientApi.get("/test")
    expect(result).toEqual({ data: "ok" })
    const getCall = mockFetch.mock.calls.find((c) => c[0] === "http://localhost:8002/test")
    expect(getCall).toBeDefined()
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve('{"detail":"Not found"}') })
    await expect(clientApi.get("/test")).rejects.toThrow("Not found")
  })
})

describe("clientApi.post", () => {
  it("calls fetch with POST and body", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 1 }) })
    const result = await clientApi.post("/create", { name: "test" })
    expect(result).toEqual({ id: 1 })
    expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:8002/create")
    expect(mockFetch.mock.calls[0][1].method).toBe("POST")
    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ name: "test" }))
  })
})

describe("clientApi.put", () => {
  it("calls fetch with PUT", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ updated: true }) })
    const result = await clientApi.put("/update/1", { name: "new" })
    expect(result).toEqual({ updated: true })
    expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:8002/update/1")
    expect(mockFetch.mock.calls[0][1].method).toBe("PUT")
  })
})

describe("clientApi.delete", () => {
  it("calls fetch with DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    await clientApi.delete("/delete/1")
    expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:8002/delete/1")
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE")
  })
})

describe("clientApi.patch", () => {
  it("calls fetch with PATCH", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ patched: true }) })
    const result = await clientApi.patch("/patch/1", { field: "val" })
    expect(result).toEqual({ patched: true })
    expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:8002/patch/1")
    expect(mockFetch.mock.calls[0][1].method).toBe("PATCH")
  })
})
