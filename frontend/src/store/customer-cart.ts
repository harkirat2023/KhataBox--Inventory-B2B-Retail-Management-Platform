import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CustomerCartItem {
  product_id: number
  name: string
  sku: string
  unit_price: number
  quantity: number
  product_uuid: string
}

interface CustomerCartState {
  items: CustomerCartItem[]
  discount: number
  addItem: (item: Omit<CustomerCartItem, "quantity">, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  setDiscount: (discount: number) => void
  clearCart: () => void
  syncWithServer: (serverItems: CustomerCartItem[]) => void
}

export const useCustomerCartStore = create<CustomerCartState>()(
  persist(
    (set) => ({
      items: [],
      discount: 0,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product_id === item.product_id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity }] }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.product_id !== productId)
            : state.items.map((i) =>
                i.product_id === productId ? { ...i, quantity } : i
              ),
        })),
      setDiscount: (discount) => set({ discount }),
      clearCart: () => set({ items: [], discount: 0 }),
      syncWithServer: (serverItems) =>
        set({ items: serverItems }),
    }),
    {
      name: "customer-cart-store",
    }
  )
)
