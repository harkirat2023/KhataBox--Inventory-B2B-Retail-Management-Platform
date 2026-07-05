import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface SelectedStore {
  id: number
  name: string
  store_type?: string
  city?: string
  address?: string
}

interface CustomerStoreState {
  selectedStore: SelectedStore | null
  recentStoreIds: number[]
  favoriteStoreIds: number[]

  setSelectedStore: (store: SelectedStore | null) => void
  clearStore: () => void
  addRecentStore: (storeId: number) => void
  toggleFavorite: (storeId: number) => void
  isFavorite: (storeId: number) => boolean
}

export const useCustomerStore = create<CustomerStoreState>()(
  persist(
    (set, get) => ({
      selectedStore: null,
      recentStoreIds: [],
      favoriteStoreIds: [],

      setSelectedStore: (store) => {
        if (store) {
          const recent = get().recentStoreIds.filter(id => id !== store.id)
          set({
            selectedStore: store,
            recentStoreIds: [store.id, ...recent].slice(0, 10),
          })
        } else {
          set({ selectedStore: null })
        }
      },

      clearStore: () => set({ selectedStore: null }),

      addRecentStore: (storeId) => {
        const recent = get().recentStoreIds.filter(id => id !== storeId)
        set({ recentStoreIds: [storeId, ...recent].slice(0, 10) })
      },

      toggleFavorite: (storeId) => {
        const favorites = get().favoriteStoreIds
        if (favorites.includes(storeId)) {
          set({ favoriteStoreIds: favorites.filter(id => id !== storeId) })
        } else {
          set({ favoriteStoreIds: [...favorites, storeId] })
        }
      },

      isFavorite: (storeId) => get().favoriteStoreIds.includes(storeId),
    }),
    { name: "customer-store-context" }
  )
)
