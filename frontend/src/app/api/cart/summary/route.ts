import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

async function fetchWithAuth(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = auth.slice(7)

  try {
    const [carts, products, stores] = await Promise.all([
      fetchWithAuth("/api/v1/cart/", token),
      fetchWithAuth("/api/v1/catalog/products", token),
      fetchWithAuth("/api/v1/stores/public", token),
    ])

    const activeCart = Array.isArray(carts) ? carts.find((c: any) => c.status === "ACTIVE") : null

    if (!activeCart) {
      return NextResponse.json({ cart: null, summary: { totalItems: 0, subtotal: 0, gst: 0, total: 0 } })
    }

    const productMap = new Map(
      (Array.isArray(products) ? products : []).map((p: any) => [p.id, p])
    )

    const storeMap = new Map(
      (Array.isArray(stores) ? stores : []).map((s: any) => [s.id, s])
    )

    const enrichedItems = (activeCart.items || []).map((item: any) => {
      const product = productMap.get(item.product_id)
      const storeId = activeCart.store_id || (product as any)?.store_id
      return {
        ...item,
        product_image: (product as any)?.image_url || null,
        product_category: (product as any)?.category || null,
        available_stock: (product as any)?.stock_quantity ?? null,
      }
    })

    const firstStoreId =
      activeCart.store_id ||
      enrichedItems.find((i: any) => i.product_category)?.store_id ||
      null
    const store = firstStoreId ? storeMap.get(firstStoreId) : null

    return NextResponse.json({
      cart: {
        ...activeCart,
        items: enrichedItems,
        store: store
          ? {
              id: (store as any).id,
              name: (store as any).name,
              city: (store as any).city,
              store_type: (store as any).store_type,
            }
          : null,
      },
      summary: {
        totalItems: enrichedItems.reduce((s: number, i: any) => s + i.quantity, 0),
        subtotal: activeCart.subtotal || 0,
        gst: activeCart.gst || 0,
        total: activeCart.total || 0,
      },
    })
  } catch (err) {
    console.error("Cart summary error:", err)
    return NextResponse.json({ error: "Failed to fetch cart summary" }, { status: 500 })
  }
}
