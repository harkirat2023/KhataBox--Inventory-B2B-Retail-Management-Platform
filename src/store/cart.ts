import { create } from "zustand"

export interface CartItem {
  product_id: number
  name: string
  sku: string
  unit_price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  discount: number
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  setDiscount: (discount: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
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
}))
