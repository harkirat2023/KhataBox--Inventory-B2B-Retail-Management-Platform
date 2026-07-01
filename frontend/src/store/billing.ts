import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CartItem {
  product_id: number
  name: string
  sku: string
  unit_price: number
  quantity: number
}

export interface BillingCart {
  id: string
  name: string
  status: "active" | "incomplete" | "cancelled"
  items: CartItem[]
  discount: number
  createdAt: string
  cancelledAt: string | null
}

interface BillingState {
  carts: BillingCart[]
  activeCartId: string | null
  addNewCart: () => void
  deleteCart: (cartId: string) => void
  switchToCart: (cartId: string) => void
  switchToNext: () => void
  switchToPrev: () => void
  addItemToActiveCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItemFromActiveCart: (productId: number) => void
  updateQtyInActiveCart: (productId: number, quantity: number) => void
  setDiscountOnActiveCart: (discount: number) => void
  clearActiveCart: () => void
}

function generateId(): string {
  return `cart-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

function createNewCart(name: string, status: "active" | "incomplete" = "active"): BillingCart {
  return {
    id: generateId(),
    name,
    status,
    items: [],
    discount: 0,
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  }
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      carts: [createNewCart("Cart 1", "active")],
      activeCartId: null,

      addNewCart: () => {
        const { carts, activeCartId } = get()
        const idx = carts.length + 1
        const newCart = createNewCart(`Cart ${idx}`, "active")

        const active = carts.find(c => c.id === activeCartId)
        const updated = carts.map(c =>
          c.id === activeCartId && active && active.status !== "cancelled"
            ? { ...c, status: "incomplete" as const }
            : c
        )

        set({ carts: [...updated, newCart], activeCartId: newCart.id })
      },

      deleteCart: (cartId: string) => {
        const { carts } = get()
        set({
          carts: carts.map(c =>
            c.id === cartId
              ? { ...c, status: "cancelled" as const, cancelledAt: new Date().toISOString() }
              : c
          ),
        })
      },

      switchToCart: (cartId: string) => {
        const { carts } = get()
        const target = carts.find(c => c.id === cartId)
        if (!target || (target.status !== "active" && target.status !== "incomplete")) return

        const { activeCartId } = get()

        const updated = carts.map(c => {
          if (c.id === activeCartId && c.status === "active") return c
          if (c.id === cartId && c.status === "incomplete") return { ...c, status: "active" as const }
          return c
        })

        set({ carts: updated, activeCartId: cartId })
      },

      switchToNext: () => {
        const { carts, activeCartId } = get()
        const navigable = carts.filter(c => c.status === "active" || c.status === "incomplete")
        if (navigable.length < 2) return
        const curIdx = navigable.findIndex(c => c.id === activeCartId)
        const next = navigable[(curIdx + 1) % navigable.length]

        const updated = carts.map(c => {
          if (c.id === activeCartId) return { ...c, status: "incomplete" as const }
          if (c.id === next.id) return { ...c, status: "active" as const }
          return c
        })

        set({ carts: updated, activeCartId: next.id })
      },

      switchToPrev: () => {
        const { carts, activeCartId } = get()
        const navigable = carts.filter(c => c.status === "active" || c.status === "incomplete")
        if (navigable.length < 2) return
        const curIdx = navigable.findIndex(c => c.id === activeCartId)
        const prev = navigable[(curIdx - 1 + navigable.length) % navigable.length]

        const updated = carts.map(c => {
          if (c.id === activeCartId) return { ...c, status: "incomplete" as const }
          if (c.id === prev.id) return { ...c, status: "active" as const }
          return c
        })

        set({ carts: updated, activeCartId: prev.id })
      },

      addItemToActiveCart: (item, quantity = 1) => {
        const { carts, activeCartId } = get()
        set({
          carts: carts.map(c => {
            if (c.id !== activeCartId) return c
            const existing = c.items.find(i => i.product_id === item.product_id)
            if (existing) {
              return {
                ...c,
                items: c.items.map(i =>
                  i.product_id === item.product_id
                    ? { ...i, quantity: i.quantity + quantity }
                    : i
                ),
              }
            }
            return { ...c, items: [...c.items, { ...item, quantity }] }
          }),
        })
      },

      removeItemFromActiveCart: (productId: number) => {
        const { carts, activeCartId } = get()
        set({
          carts: carts.map(c =>
            c.id !== activeCartId
              ? c
              : { ...c, items: c.items.filter(i => i.product_id !== productId) }
          ),
        })
      },

      updateQtyInActiveCart: (productId: number, quantity: number) => {
        const { carts, activeCartId } = get()
        set({
          carts: carts.map(c => {
            if (c.id !== activeCartId) return c
            return {
              ...c,
              items: quantity <= 0
                ? c.items.filter(i => i.product_id !== productId)
                : c.items.map(i =>
                    i.product_id === productId ? { ...i, quantity } : i
                  ),
            }
          }),
        })
      },

      setDiscountOnActiveCart: (discount: number) => {
        const { carts, activeCartId } = get()
        set({
          carts: carts.map(c =>
            c.id !== activeCartId ? c : { ...c, discount }
          ),
        })
      },

      clearActiveCart: () => {
        const { carts, activeCartId } = get()
        set({
          carts: carts.map(c =>
            c.id !== activeCartId ? c : { ...c, items: [], discount: 0 }
          ),
        })
      },
    }),
    {
      name: "khatabox-billing-store",
    }
  )
)
