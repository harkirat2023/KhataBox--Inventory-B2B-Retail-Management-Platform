import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

async function fetchWithAuth(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = auth.slice(7)

  try {
    const body = await request.json().catch(() => ({}))
    const paymentMethod = body.payment_method || "credit"

    const [carts, allProducts] = await Promise.all([
      fetchWithAuth("/api/v1/cart/", token),
      fetchWithAuth("/api/v1/catalog/products", token),
    ])

    const activeCart = Array.isArray(carts) ? carts.find((c: any) => c.status === "ACTIVE") : null

    if (!activeCart) {
      return NextResponse.json({ valid: false, errors: ["No active cart found"] })
    }

    if (!activeCart.items || activeCart.items.length === 0) {
      return NextResponse.json({ valid: false, errors: ["Cart is empty"] })
    }

    const productMap = new Map(
      (Array.isArray(allProducts) ? allProducts : []).map((p: any) => [p.id, p])
    )

    const stockIssues: string[] = []
    const priceIssues: string[] = []

    for (const item of activeCart.items) {
      const product = productMap.get(item.product_id)
      if (!product) {
        stockIssues.push(`${item.product_name} is no longer available`)
        continue
      }

      const available = (product as any).stock_quantity ?? 0
      if (available < item.quantity) {
        stockIssues.push(
          `${item.product_name}: only ${available} in stock, requested ${item.quantity}`
        )
      }
    }

    const errors = [...stockIssues, ...priceIssues]
    return NextResponse.json({
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      cart: {
        id: activeCart.id,
        totalItems: activeCart.items.reduce((s: number, i: any) => s + i.quantity, 0),
        subtotal: activeCart.subtotal,
        gst: activeCart.gst,
        total: activeCart.total,
      },
      payment_method: paymentMethod,
    })
  } catch (err) {
    console.error("Cart validation error:", err)
    return NextResponse.json({ valid: false, errors: ["Validation failed"] }, { status: 500 })
  }
}
