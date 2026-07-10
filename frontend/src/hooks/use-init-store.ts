"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"
import { queryKeys } from "@/lib/query-keys"

interface Store {
  id: number
  name: string
}

export function useInitStore() {
  const { activeStore, setActiveStore } = useStoreContext()

  const { data: stores } = useQuery({
    queryKey: queryKeys.dashboard.stores(),
    queryFn: () => clientApi.get<Store[]>("/api/v1/stores/"),
    enabled: !activeStore.id,
  })

  useEffect(() => {
    if (stores && stores.length > 0 && !activeStore.id) {
      setActiveStore({ id: stores[0].id, name: stores[0].name })
    }
  }, [stores, activeStore.id, setActiveStore])

  return { activeStore, stores }
}
