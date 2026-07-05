import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CustomerCartItem {
  product_id: number
  name: string
  sku: string
  unit_price: number
  quantity: number
  product_uuid: string
  storeId: number
}

interface CustomerCartState {
  selectedStoreId: number | null
  hasStoreConflict: boolean
  pendingStoreId: number | null
  pendingItem: (Omit<CustomerCartItem, "quantity"> & { quantity: number }) | null

  items: CustomerCartItem[]
  discount: number

  syncSelectedStore: (storeId: number) => void
  addItem: (item: Omit<CustomerCartItem, "quantity">, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  setDiscount: (discount: number) => void
  clearCart: () => void
  syncWithServer: (serverItems: CustomerCartItem[]) => void
  cancelStoreConflict: () => void
  confirmStoreSwitch: () => void
}

export const useCustomerCartStore = create<CustomerCartState>()(
  persist(
    (set, get) => ({
      selectedStoreId: null,
      hasStoreConflict: false,
      pendingStoreId: null,
      pendingItem: null,

      items: [],
      discount: 0,

      syncSelectedStore: (storeId: number) =>
        set((state) => {
          if (state.items.length === 0) {
            return { selectedStoreId: storeId }
          }
          return state
        }),

      addItem: (item, quantity = 1) =>
        set((state) => {
          if (state.items.length === 0 || state.selectedStoreId === null) {
            return {
              selectedStoreId: item.storeId,
              hasStoreConflict: false,
              pendingStoreId: null,
              pendingItem: null,
              items: [...state.items, { ...item, quantity }],
            }
          }

          if (item.storeId === state.selectedStoreId) {
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
          }

          return {
            hasStoreConflict: true,
            pendingStoreId: item.storeId,
            pendingItem: { ...item, quantity },
          }
        }),

      removeItem: (productId) =>
        set((state) => {
          const updated = state.items.filter((i) => i.product_id !== productId)
          return {
            items: updated,
            ...(updated.length === 0
              ? { selectedStoreId: null, hasStoreConflict: false, pendingStoreId: null, pendingItem: null }
              : {}),
          }
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          const updated =
            quantity <= 0
              ? state.items.filter((i) => i.product_id !== productId)
              : state.items.map((i) =>
                  i.product_id === productId ? { ...i, quantity } : i
                )
          return {
            items: updated,
            ...(updated.length === 0
              ? { selectedStoreId: null, hasStoreConflict: false, pendingStoreId: null, pendingItem: null }
              : {}),
          }
        }),

      setDiscount: (discount) => set({ discount }),

      clearCart: () =>
        set({
          selectedStoreId: null,
          hasStoreConflict: false,
          pendingStoreId: null,
          pendingItem: null,
          items: [],
          discount: 0,
        }),

      syncWithServer: (serverItems) => {
        set((state) => {
          const derivedSelected = state.selectedStoreId ?? (serverItems[0]?.storeId ?? null)
          return {
            ...state,
            selectedStoreId: derivedSelected,
            items: serverItems,
          }
        })
      },

      cancelStoreConflict: () =>
        set({ hasStoreConflict: false, pendingStoreId: null, pendingItem: null }),

      confirmStoreSwitch: () =>
        set((state) => {
          if (!state.pendingItem) {
            return { hasStoreConflict: false, pendingStoreId: null, pendingItem: null }
          }
          return {
            selectedStoreId: state.pendingStoreId,
            items: [{ ...state.pendingItem }],
            hasStoreConflict: false,
            pendingStoreId: null,
            pendingItem: null,
          }
        }),
    }),
    { name: "customer-cart-store" }
  )
)
