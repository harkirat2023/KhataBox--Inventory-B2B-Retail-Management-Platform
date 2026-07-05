"use client"

import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Store, ScanLine, Package, Clock, MapPin,
  Search, ChevronRight, ShoppingCart, Sparkles, Store as StoreIcon,
  RefreshCw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole } from "@/components/auth/role-guard"
import { useQuery } from "@tanstack/react-query"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore } from "@/store/customer-cart"
import { useCustomerStore } from "@/store/customer-store"
import { BottomNav } from "@/components/layout/bottom-nav"

interface StoreItem {
  id: number
  name: string
  store_type: string
  address: string | null
  city: string | null
  state: string | null
  business_description: string | null
}

const storeTypeIcons: Record<string, LucideIcon> = {
  kirana: Store, supermart: ShoppingCart, pharmacy: StoreIcon,
  electronics: StoreIcon, clothing: StoreIcon, restaurant: StoreIcon, other: Store,
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function getTodayDate(): string {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
}

function StoreCategoryChip({
  icon: Icon,
  label,
  active,
  colorClass,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  colorClass: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 min-w-[72px] py-2 px-3 rounded-2xl transition-all duration-200 ${
        active
          ? "bg-blue-600 text-white shadow-md shadow-blue-200/40 scale-105"
          : "bg-white text-slate-600 border border-slate-200 hover:border-blue-200 hover:shadow-sm hover:scale-105"
      }`}
    >
      <div className={`size-9 rounded-xl flex items-center justify-center ${
        active ? "bg-white/20" : colorClass
      }`}>
        <Icon className="size-4" />
      </div>
      <span className="text-[10px] font-semibold capitalize leading-tight">{label}</span>
    </button>
  )
}

function StoreCard({
  store,
  isSelected,
  onSelect,
  colorClass,
}: {
  store: StoreItem
  isSelected: boolean
  onSelect: () => void
  colorClass: string
}) {
  const initials = getInitials(store.name)

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-5 flex items-center gap-4 transition-all duration-200 group ${
        isSelected
          ? "border-blue-500 bg-blue-50/30 shadow-lg shadow-blue-200/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      <Avatar className="size-14 rounded-2xl shrink-0 shadow-sm">
        <AvatarFallback className={`rounded-2xl text-lg font-bold ${colorClass}`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className={`text-lg font-semibold leading-snug transition-colors duration-200 ${
            isSelected ? "text-blue-700" : "text-slate-900 group-hover:text-blue-600"
          }`}>
            {store.name}
          </h3>
          {isSelected && (
            <Badge variant="default" className="bg-blue-600 text-white text-[10px] px-2 py-0 h-5 rounded-full shrink-0">
              Selected
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <span className="capitalize">{store.store_type || "Store"}</span>
          {store.city && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                {store.city}
              </span>
            </>
          )}
        </div>
        {store.business_description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{store.business_description}</p>
        )}
      </div>
      <div className={`size-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 ${
        isSelected
          ? "bg-blue-100 text-blue-600"
          : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
      }`}>
        <ChevronRight className="size-4" />
      </div>
    </button>
  )
}

export default function CustomerHome() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const router = useRouter()
  const { items } = useCustomerCartStore()
  const { selectedStore, setSelectedStore } = useCustomerStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) redirect("/login")
    if (role && ["admin", "shopkeeper"].includes(role)) redirect("/dashboard")
  }, [session, status, role])

  const { data: stores, isLoading: storesLoading, isError: storesError } = useQuery({
    queryKey: ["stores", "public"],
    queryFn: () => clientApi.get<StoreItem[]>("/api/v1/stores/public"),
    enabled: role === "customer",
    retry: 2, staleTime: 30000,
  })

  const handleSelectStore = (store: StoreItem) => {
    setSelectedStore({ id: store.id, name: store.name, store_type: store.store_type, city: store.city ?? undefined, address: store.address ?? undefined })
    router.push(`/catalog?store_id=${store.id}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) router.push(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  const categories = stores ? [...new Set(stores.map((s) => s.store_type).filter(Boolean))] : []
  const filteredStores = selectedCategory
    ? stores?.filter((s) => s.store_type === selectedCategory)
    : stores
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const userName = session?.user?.name || "there"
  const todayDate = getTodayDate()

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Loading State */}
        {(status === "loading" || storesLoading) && (
          <div className="px-5 mt-6 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <Skeleton className="size-14 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="size-9 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        )}

        {!storesLoading && (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-b from-blue-600 to-blue-500 text-white px-5 pt-6 pb-7">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-blue-100 text-sm font-medium">Welcome back 👋</p>
                  <h1 className="text-xl font-bold">{userName}</h1>
                  <p className="text-blue-100/80 text-xs mt-0.5">{todayDate}</p>
                </div>
                <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm shrink-0">
                  <Sparkles className="size-4 text-white" />
                </div>
              </div>
              <p className="text-blue-100/80 text-sm mt-2">Choose a nearby store and start shopping.</p>
              <form onSubmit={handleSearchSubmit} className="relative mt-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input placeholder="Search stores..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 h-14 bg-white border-0 text-slate-900 placeholder:text-slate-400 rounded-xl shadow-sm text-base" />
              </form>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="px-5 mt-4">
                <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
                  <StoreCategoryChip
                    icon={Package}
                    label="All"
                    active={selectedCategory === null}
                    colorClass="bg-slate-100 text-slate-600"
                    onClick={() => setSelectedCategory(null)}
                  />
                  {categories.map((cat) => {
                    const Icon = storeTypeIcons[cat] || StoreIcon
                    const colorClass = "bg-slate-100 text-slate-600"
                    return (
                      <StoreCategoryChip
                        key={cat}
                        icon={Icon}
                        label={cat}
                        active={selectedCategory === cat}
                        colorClass={colorClass}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error State */}
            {storesError && (
              <div className="px-5 mt-10">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm max-w-md mx-auto">
                  <div className="size-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                    <Store className="size-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Failed to load stores</h3>
                  <p className="text-sm text-slate-500 mb-5">Check your connection and try again</p>
                  <Button variant="outline" className="rounded-xl h-11 px-6" onClick={() => window.location.reload()}>Retry</Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!storesError && (!stores || stores.length === 0) && (
              <div className="px-5 mt-10">
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm max-w-md mx-auto">
                  <div className="size-20 mx-auto mb-5 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Package className="size-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-1">No stores available nearby</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">Stores in your area will appear here once they join KhataBox.</p>
                  <Button variant="outline" className="rounded-xl h-11 px-6" onClick={() => window.location.reload()}>
                    <RefreshCw className="size-4 mr-2" /> Refresh
                  </Button>
                </div>
              </div>
            )}

            {/* Store Grid */}
            {!storesError && stores && stores.length > 0 && (
              <div className="px-5 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Stores</h2>
                  <span className="text-xs text-slate-500 font-medium">{filteredStores?.length || 0} Stores Available</span>
                </div>
                <div className="space-y-5">
                  {filteredStores?.map((store) => {
                    const colorClass = "bg-slate-100 text-slate-600"
                    const isSelected = selectedStore?.id === store.id
                    return (
                      <StoreCard
                        key={store.id}
                        store={store}
                        isSelected={isSelected}
                        onSelect={() => handleSelectStore(store)}
                        colorClass={colorClass}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {stores && stores.length > 0 && (
              <div className="px-5 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/scan">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/20 hover:-translate-y-0.5 transition-all duration-200 group">
                      <div className="size-11 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors duration-200">
                        <ScanLine className="size-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">Scan & Add</p>
                        <p className="text-xs text-slate-500">Scan QR codes</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/my-orders">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/20 hover:-translate-y-0.5 transition-all duration-200 group">
                      <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                        <Clock className="size-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">My Orders</p>
                        <p className="text-xs text-slate-500">Track & manage</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* Cart Mini Card */}
            {cartCount > 0 && (
              <div className="px-5 mt-4">
                <Link href="/cart">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-blue-200/40 hover:shadow-xl hover:shadow-blue-300/50 hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                        <ShoppingCart className="size-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</p>
                        <p className="text-xs text-blue-200">Tap to view & checkout</p>
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-blue-200" />
                  </div>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
