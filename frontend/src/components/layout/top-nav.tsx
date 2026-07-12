"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser } from "@/hooks/use-user"
import { clearAuthToken, clientApi } from "@/lib/client-api"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Search, Boxes, Command, Settings as SettingsIcon, Pencil, Package, Loader2, BellDot, ShoppingCart, Users, Truck, Store, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RenameStoreDialog } from "./rename-store-dialog"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useRole } from "@/components/auth/role-guard"
import { useStoreContext } from "@/lib/store-context"

interface SearchResultItem {
  id: number
  type: string
  name?: string
  sku?: string
  selling_price?: number
  stock_quantity?: number
  category?: string
  order_number?: string
  status?: string
  total?: number
  customer_name?: string
  email?: string
  phone?: string
  contact_person?: string
  po_number?: string
  store_type?: string
}

interface GlobalSearchResponse {
  products?: SearchResultItem[]
  orders?: SearchResultItem[]
  customers?: SearchResultItem[]
  suppliers?: SearchResultItem[]
  purchase_orders?: SearchResultItem[]
  stores?: SearchResultItem[]
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  product: Package,
  order: ShoppingCart,
  customer: Users,
  supplier: Truck,
  purchase_order: FileText,
  store: Store,
}

const CATEGORY_LABELS: Record<string, string> = {
  product: "Products",
  order: "Orders",
  customer: "Customers",
  supplier: "Suppliers",
  purchase_order: "Purchase Orders",
  store: "Stores",
}

export function TopNav() {
  const router = useRouter()
  const { user } = useUser()
  const { role } = useRole()
  const { activeStore } = useStoreContext()
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse>({})
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U"

  const homeLink = role === "customer" ? "/" : "/dashboard"

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults({})
      setShowResults(false)
      return
    }
    setSearching(true)
    try {
      const data = await clientApi.get<GlobalSearchResponse>(`/api/v1/search/?q=${encodeURIComponent(q)}&limit=5`)
      setSearchResults(data)
      const hasResults = Object.values(data).some((arr) => arr && arr.length > 0)
      setShowResults(hasResults)
    } catch {
      setSearchResults({})
      setShowResults(false)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, doSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const selectResult = (item: SearchResultItem) => {
    setShowResults(false)
    setSearchQuery("")
    switch (item.type) {
      case "product":
        router.push(`/inventory?product_id=${item.id}`)
        break
      case "order":
        router.push(`/orders?id=${item.id}`)
        break
      case "customer":
        router.push(`/customers?id=${item.id}`)
        break
      case "supplier":
        router.push(`/suppliers?id=${item.id}`)
        break
      case "purchase_order":
        router.push(`/purchase-orders?id=${item.id}`)
        break
      case "store":
        router.push(`/stores?id=${item.id}`)
        break
    }
  }

  const handleSignOut = () => {
    clearAuthToken()
    router.push("/login")
  }

  const totalResults = Object.values(searchResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)

  return (
    <header className="sticky top-0 z-40 flex items-center h-[64px] border-b border-border bg-white dark:bg-[#121214] backdrop-blur-xl px-4 lg:px-6 gap-2 lg:gap-3">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0" />

      <Link href={homeLink} className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
          <Boxes className="size-5 text-primary" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-foreground hidden sm:block">KhataBox</span>
      </Link>

      <div ref={searchRef} className="hidden sm:flex relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          placeholder="Search products, orders, customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (totalResults > 0) setShowResults(true) }}
          className="w-full h-10 pl-10 pr-14 rounded-full border border-border bg-muted/50 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 focus:bg-background transition-all" />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 font-mono">
            <Command className="size-3" />K
          </kbd>
        </div>

        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
            {Object.entries(searchResults).map(([category, items]) => {
              if (!items || items.length === 0) return null
              const Icon = CATEGORY_ICONS[category] || Package
              return (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Icon className="size-3" />
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  {items.map((item) => (
                    <button
                      key={`${category}-${item.id}`}
                      onClick={() => selectResult(item)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name || item.order_number || item.po_number || item.contact_person || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.sku && <span className="font-mono">{item.sku} · </span>}
                          {item.category && <span>{item.category} · </span>}
                          {item.status && <span>{item.status} · </span>}
                          {item.email && <span>{item.email} · </span>}
                          {item.store_type && <span>{item.store_type}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {item.selling_price != null && (
                          <p className="text-sm font-semibold text-foreground">₹{item.selling_price.toFixed(2)}</p>
                        )}
                        {item.total != null && (
                          <p className="text-sm font-semibold text-foreground">₹{item.total.toFixed(2)}</p>
                        )}
                        {item.stock_quantity != null && (
                          <p className={`text-xs ${item.stock_quantity <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
                            {item.stock_quantity} left
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-10 pl-2 pr-3 rounded-xl hover:bg-accent outline-none cursor-pointer transition-colors">
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate text-foreground">{user?.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-card rounded-xl p-1.5">
            <DropdownMenuLabel className="px-2 py-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm text-foreground">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60 mx-1" />
            <DropdownMenuItem onSelect={() => router.push("/settings")} className="rounded-lg text-muted-foreground focus:text-foreground focus:bg-accent">
              <SettingsIcon className="size-4 mr-2" />Settings
            </DropdownMenuItem>
            {role && ["admin", "shopkeeper"].includes(role) && activeStore?.id && (
              <DropdownMenuItem onSelect={() => setRenameDialogOpen(true)} className="rounded-lg text-muted-foreground focus:text-foreground focus:bg-accent">
                <Pencil className="size-4 mr-2" />Rename Store
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-border/60 mx-1" />
            <DropdownMenuItem onSelect={handleSignOut}
              className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="size-4 mr-2" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activeStore?.id && (
        <RenameStoreDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          store={{ id: activeStore.id, name: activeStore.name || "Store" }}
          onRenamed={(newName) => { useStoreContext.getState().setActiveStore({ id: activeStore.id!, name: newName }) }}
        />
      )}
    </header>
  )
}


function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const fetchCount = async () => {
      try {
        const data = await clientApi.get<{ count: number }>("/api/v1/notifications/unread-count")
        if (!cancelled) setUnreadCount(data.count)
      } catch { /* ignore */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <Button variant="ghost" size="icon" className="relative rounded-xl text-muted-foreground hover:text-foreground" onClick={() => router.push("/notifications")}>
      {unreadCount > 0 ? <BellDot className="size-5" /> : <Bell className="size-5" />}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center size-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  )
}
