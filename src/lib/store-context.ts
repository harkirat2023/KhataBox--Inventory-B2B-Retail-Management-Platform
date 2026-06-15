import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ActiveStore {
  id: number | null
  name: string | null
}

interface StoreContextState {
  activeStore: ActiveStore
  setActiveStore: (store: ActiveStore) => void
  clearActiveStore: () => void
}

export const useStoreContext = create<StoreContextState>()(
  persist(
    (set) => ({
      activeStore: { id: null, name: null },
      setActiveStore: (store) => set({ activeStore: store }),
      clearActiveStore: () => set({ activeStore: { id: null, name: null } }),
    }),
    { name: "khatabox-active-store" }
  )
)
