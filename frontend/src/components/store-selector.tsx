"use client"

import { useState, useMemo } from "react"
import { Store, MapPin, Search, X, ChevronRight, Star, Clock, Store as StoreIcon, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StoreItem {
  id: number
  name: string
  store_type: string
  city: string | null
  state: string | null
  address: string | null
  business_description: string | null
}

interface StoreSelectorProps {
  stores: StoreItem[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onSelect: (store: StoreItem) => void
  selectedStoreId?: number | null
  recentStoreIds?: number[]
}

const storeTypeIcons: Record<string, string> = {
  kirana: "🛒",
  supermart: "🏪",
  pharmacy: "💊",
  electronics: "📱",
  clothing: "👕",
  restaurant: "🍽️",
  other: "🏬",
}

const storeTypeColors: Record<string, string> = {
  kirana: "bg-amber-100 text-amber-700",
  supermart: "bg-emerald-100 text-emerald-700",
  pharmacy: "bg-sky-100 text-sky-700",
  electronics: "bg-violet-100 text-violet-700",
  clothing: "bg-pink-100 text-pink-700",
  restaurant: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
}

export function StoreSelector({ stores, loading, error, onRetry, onSelect, selectedStoreId, recentStoreIds }: StoreSelectorProps) {
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return stores
    const q = search.toLowerCase()
    return stores.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.store_type?.toLowerCase().includes(q) ||
        s.business_description?.toLowerCase().includes(q)
    )
  }, [stores, search])

  const recentStores = useMemo(() => {
    if (!recentStoreIds?.length) return []
    return recentStoreIds
      .map(id => stores.find(s => s.id === id))
      .filter(Boolean) as StoreItem[]
  }, [stores, recentStoreIds])

  const displayStores = showAll ? filtered : filtered.slice(0, 8)

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-xl animate-pulse">
          <div className="size-10 rounded-xl bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border animate-pulse">
            <div className="size-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-36 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center">
        <div className="size-16 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">
          <Store className="size-8 text-red-400" />
        </div>
        <p className="font-medium text-red-600">Failed to load stores</p>
        <p className="text-xs text-muted-foreground mt-1">Check your connection and try again</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center">
        <div className="size-16 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
          <Store className="size-8 text-muted-foreground/40" />
        </div>
        <p className="font-medium text-muted-foreground">No stores available yet</p>
        <p className="text-xs text-muted-foreground mt-1">Check back later</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search stores by name, location, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10 h-11 bg-white border rounded-xl text-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Recent Stores */}
      {recentStores.length > 0 && !search && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Clock className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Recent</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recentStores.map(store => (
              <button
                key={store.id}
                onClick={() => onSelect(store)}
                className="flex flex-col items-center gap-1 min-w-[80px] p-2 rounded-xl bg-white border hover:border-primary/40 hover:shadow-sm transition-all shrink-0"
              >
                <div className={`size-10 rounded-xl ${storeTypeColors[store.store_type] || "bg-gray-100 text-gray-700"} flex items-center justify-center text-lg`}>
                  {storeTypeIcons[store.store_type] || "🏬"}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground text-center truncate w-full leading-tight">
                  {store.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Store Grid */}
      {search && filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center">
          <Search className="size-10 mx-auto text-muted-foreground/20 mb-2" />
          <p className="font-medium text-muted-foreground">No stores match &ldquo;{search}&rdquo;</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayStores.map((store, idx) => {
            const isSelected = selectedStoreId === store.id
            const Icon = storeTypeIcons[store.store_type] || "🏬"
            const colorClass = storeTypeColors[store.store_type] || "bg-gray-100 text-gray-700"
            return (
              <button
                key={store.id}
                onClick={() => onSelect(store)}
                className={`w-full bg-white rounded-2xl border p-4 flex items-center gap-4 text-left transition-all duration-200 hover:shadow-md group ${
                  isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/[0.02]" : "hover:border-primary/40"
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className={`size-14 rounded-2xl ${colorClass} flex items-center justify-center shrink-0 shadow-sm text-2xl`}>
                  {Icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold group-hover:text-primary transition-colors ${isSelected ? "text-primary" : ""}`}>
                      {store.name}
                    </h3>
                    {isSelected && (
                      <span className="text-[10px] font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded-full shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                  {store.store_type && (
                    <span className="text-[11px] font-medium text-muted-foreground capitalize">{store.store_type}</span>
                  )}
                  {(store.city || store.address) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{store.address || store.city}{store.state ? `, ${store.state}` : ""}</span>
                    </p>
                  )}
                  {store.business_description && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{store.business_description}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <div className={`size-8 rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted group-hover:bg-primary/10 group-hover:text-primary"
                  }`}>
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              </button>
            )
          })}

          {/* Show More / Show Less */}
          {filtered.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showAll ? `Show less` : `Show all ${filtered.length} stores`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
