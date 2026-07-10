"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser } from "@/hooks/use-user"
import { clearAuthToken, clientApi } from "@/lib/client-api"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Search, Boxes, Command, Settings as SettingsIcon, Pencil, Package, Loader2 } from "lucide-react"
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

interface SearchResult {
  id: number
  name: string
  sku: string
  selling_price: number
  stock_quantity: number
  category?: string
}

export function TopNav() {
  const router = useRouter()
  const { user } = useUser()
  const { role } = useRole()
  const { activeStore } = useStoreContext()
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U"

  const homeLink = role === "customer" ? "/" : "/dashboard"

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    setSearching(true)
    try {
      const data = await clientApi.get<SearchResult[]>(`/api/v1/products/?search=${encodeURIComponent(q)}&page_size=8`)
      setSearchResults(data)
      setShowResults(data.length > 0)
    } catch {
      setSearchResults([])
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

  const selectResult = (product: SearchResult) => {
    setShowResults(false)
    setSearchQuery("")
    router.push(`/billing?product_id=${product.id}`)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center h-[64px] border-b border-border bg-white dark:bg-[#121214] backdrop-blur-xl px-4 lg:px-6 gap-3">
      <SidebarTrigger className="hidden lg:flex -ml-1 text-muted-foreground hover:text-foreground" />

      <Link href={homeLink} className="flex items-center gap-2.5 lg:hidden">
        <div className="flex items-center justify-center size-8 rounded-[4px] bg-primary/10">
          <Boxes className="size-5 text-primary" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-foreground">KhataBox</span>
      </Link>

      <div ref={searchRef} className="hidden sm:flex relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          placeholder={role === "customer" ? "Search products..." : "Search products, orders..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowResults(true) }}
          className="w-full h-10 pl-10 pr-12 rounded-[6px] border border-border bg-muted/50 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/60 focus:bg-background transition-all" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          <kbd className="hidden md:inline-flex items-center gap-1 rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground font-mono">
            <Command className="size-3" />K
          </kbd>
        </div>

        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-[6px] border border-border bg-card shadow-lg overflow-hidden z-50">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => selectResult(product)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
              >
                <Package className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{product.sku}</span>
                    {product.category && <span> &middot; {product.category}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">₹{product.selling_price.toFixed(2)}</p>
                  <p className={`text-xs ${product.stock_quantity <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
                    {product.stock_quantity} left
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative rounded-[6px] text-muted-foreground hover:text-foreground" onClick={() => router.push("/notifications")}>
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-[6px] hover:bg-accent outline-none cursor-pointer">
            <Avatar className="size-7 rounded-[4px]">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate text-foreground">{user?.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-card">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onSelect={() => router.push("/settings")} className="text-muted-foreground focus:text-foreground focus:bg-accent">
              <SettingsIcon className="size-4 mr-2" />Settings
            </DropdownMenuItem>
            {role && ["admin", "shopkeeper"].includes(role) && activeStore?.id && (
              <DropdownMenuItem onSelect={() => setRenameDialogOpen(true)} className="text-muted-foreground focus:text-foreground focus:bg-accent">
                <Pencil className="size-4 mr-2" />Rename Store
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onSelect={() => { clearAuthToken(); router.push("/khatabox") }}
              className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
