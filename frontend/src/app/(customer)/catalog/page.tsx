"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Search, Package, ShoppingCart, Plus, X, Store, MapPin,
  Minus, ArrowLeft, AlertTriangle, ChevronRight,
  CircleCheck, CircleAlert, CircleOff, Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore } from "@/store/customer-cart"
import { useCustomerStore } from "@/store/customer-store"
import { toast } from "sonner"
import { BottomNav } from "@/components/layout/bottom-nav"

interface Product {
  id: number
  name: string
  sku: string
  category: string
  brand: string
  selling_price: number
  stock_quantity: number
  store_id?: number
}

interface StoreItem {
  id: number
  name: string
  store_type: string
  city: string | null
  state: string | null
  address: string | null
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function getStockInfo(qty: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: LucideIcon; color: string } {
  if (qty <= 0) return { label: "Out of Stock", variant: "destructive", icon: CircleOff, color: "text-red-600 bg-red-50 border-red-200" }
  if (qty <= 10) return { label: `only ${qty} left`, variant: "outline", icon: CircleAlert, color: "text-amber-600 bg-amber-50 border-amber-200" }
  return { label: "In Stock", variant: "outline", icon: CircleCheck, color: "text-green-600 bg-green-50 border-green-200" }
}

function StoreSwitchModal({
  open, currentStoreName, newStoreName, onCancel, onConfirm,
}: {
  open: boolean; currentStoreName: string; newStoreName: string; onCancel: () => void; onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="size-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="size-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-center text-foreground mb-2">Switch Store?</h3>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Your cart currently has items from <strong className="text-foreground/80">{currentStoreName}</strong>.
          <br /><br />
          Continuing will clear your existing cart and start a new cart for <strong className="text-foreground/80">{newStoreName}</strong>.
        </p>
        <div className="flex gap-2 mt-6">
          <Button className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1 rounded-xl h-11 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={onConfirm}>Continue</Button>
        </div>
      </div>
    </div>
  )
}

function CatalogContent() {
  const { isLoaded, isSignedIn, role } = useRole()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [storeData, setStoreData] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [switchModalOpen, setSwitchModalOpen] = useState(false)
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)

  const { items, addItem, clearCart, selectedStoreId, cancelStoreConflict } = useCustomerCartStore()
  const { selectedStore } = useCustomerStore()

  const storeIdFromUrl = searchParams.get("store_id")
  const storeId = storeIdFromUrl ? parseInt(storeIdFromUrl) : selectedStore?.id || null

  const redirectToHome = useCallback(() => router.push("/customer"), [router])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }
    if (role && role !== "customer") { router.push("/dashboard"); return }
  }, [isLoaded, isSignedIn, role, router])

  useEffect(() => {
    if (!storeId && role === "customer" && !loading) redirectToHome()
  }, [storeId, role, loading, redirectToHome])

  useEffect(() => {
    async function fetchStoreInfo() {
      if (!storeId) return
      try {
        const allStores = await clientApi.get<StoreItem[]>("/api/v1/stores/public")
        const store = allStores.find((s) => s.id === storeId)
        if (store) setStoreData(store)
      } catch (e) { console.error("Failed to fetch store:", e) }
      setLoading(false)
    }
    fetchStoreInfo()
  }, [storeId])

  useEffect(() => {
    async function fetchProducts() {
      if (!storeId) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("store_id", String(storeId))
        if (search) params.set("search", search)
        const prods = await clientApi.get<Product[]>(`/api/v1/catalog/products?${params.toString()}`)
        setProducts(prods)
        const cats = [...new Set(prods.map((p) => p.category).filter(Boolean))]
        setCategories(cats.sort())
      } catch (e) { console.error("Failed to load products:", e); setProducts([]) }
      setLoading(false)
    }
    if (role === "customer" && storeId) fetchProducts()
  }, [role, storeId, search])

  useEffect(() => {
    let filtered = products
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))
    }
    if (category) filtered = filtered.filter((p) => p.category === category)
    setFilteredProducts(filtered)
  }, [search, category, products])

  const currentStoreName = storeData?.name || "current store"

  const handleAddToCart = (product: Product) => {
    if (!storeId) return
    if (items.length > 0 && selectedStoreId && selectedStoreId !== storeId) {
      setPendingProduct(product)
      setSwitchModalOpen(true)
      return
    }
    addItem({ product_id: product.id, name: product.name, sku: product.sku, unit_price: product.selling_price, product_uuid: "", storeId })
    toast.success(`${product.name} added to cart`)
  }

  const handleConfirmSwitch = () => {
    if (!pendingProduct || !storeId) return
    clearCart()
    addItem({ product_id: pendingProduct.id, name: pendingProduct.name, sku: pendingProduct.sku, unit_price: pendingProduct.selling_price, product_uuid: "", storeId })
    setSwitchModalOpen(false); setPendingProduct(null)
    toast.success(`${pendingProduct.name} added to cart`)
  }

  const handleCancelSwitch = () => { cancelStoreConflict(); setSwitchModalOpen(false); setPendingProduct(null) }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center"><Package className="size-10 animate-pulse mx-auto text-primary" /><p className="text-muted-foreground mt-3">Loading...</p></div>
      </div>
    )
  }

  if (!storeId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center max-w-sm px-4">
          <div className="size-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Store className="size-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">No Store Selected</h2>
          <p className="text-muted-foreground text-sm mb-6">Please select a store to browse products</p>
          <Link href="/customer"><Button className="rounded-xl h-11 px-6"><Store className="size-4 mr-2" />Select a Store</Button></Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const cartSubtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const storeInitials = storeData ? getInitials(storeData.name) : "ST"

  return (
    <div className="min-h-screen bg-background pb-28">
      <StoreSwitchModal open={switchModalOpen} currentStoreName={currentStoreName}
        newStoreName={storeData?.name || "this store"} onCancel={handleCancelSwitch} onConfirm={handleConfirmSwitch} />

      {/* Sticky Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center gap-3 mb-2.5">
            <Link href="/customer" className="size-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted transition-colors shrink-0">
              <ArrowLeft className="size-4 text-muted-foreground" />
            </Link>
            <Avatar className="size-9 rounded-xl shrink-0 shadow-sm">
              <AvatarFallback className="rounded-xl text-xs font-bold bg-primary/10 text-primary">
                {storeInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base text-foreground truncate leading-snug">{storeData?.name || "Catalog"}</h1>
              {storeData?.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{storeData.city}{storeData.state ? `, ${storeData.state}` : ""}</span>
                </p>
              )}
            </div>
            <Link href="/cart" className="relative size-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted transition-colors shrink-0">
              <ShoppingCart className="size-4 text-muted-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-primary text-[9px] font-bold text-white rounded-full flex items-center justify-center shadow-sm shadow-blue-200">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder={`Search in ${storeData?.name || "store"}...`} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-10 bg-muted border-0 rounded-xl text-sm focus-visible:bg-card transition-colors" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Chips */}
      {categories.length > 0 && !loading && (
        <div className="px-4 py-3 overflow-x-auto scrollbar-none sticky top-[108px] z-20 bg-background border-b border-border">
          <div className="flex gap-2">
            <button onClick={() => setCategory("")}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                category === ""
                  ? "bg-primary text-white border-primary shadow-sm shadow-blue-200/40"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
              }`}>
              All
            </button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 capitalize whitespace-nowrap ${
                  category === cat
                    ? "bg-primary text-white border-primary shadow-sm shadow-blue-200/40"
: "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading products..." : (
              <>{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
              {search && <> for &ldquo;{search}&rdquo;</>}</>
            )}
          </p>
          {!loading && filteredProducts.length > 0 && (
            <Badge variant="outline" className="text-[11px] text-muted-foreground border-border rounded-full px-3">
              <Tag className="size-3 mr-1" />
              {category || "All"}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="p-3 space-y-2.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center mt-2 shadow-sm max-w-sm mx-auto">
            <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center border border-border">
              <Package className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{search ? "No products found" : "This store has no products yet"}</h3>
            <p className="text-sm text-muted-foreground mb-5">{search ? "Try a different search term" : "Check back later or browse another store"}</p>
            <div className="flex gap-2 justify-center">
              {search
                ? <Button variant="outline" className="rounded-xl h-10 px-5" onClick={() => setSearch("")}>Clear Search</Button>
                : <Link href="/customer"><Button variant="outline" className="rounded-xl h-10 px-5"><Store className="size-3.5 mr-1.5" />Browse Stores</Button></Link>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {filteredProducts.map((product) => {
              const inCart = items.find((item) => item.product_id === product.id)
              const stockInfo = getStockInfo(product.stock_quantity)
              const StockIcon = stockInfo.icon
              const isInStock = product.stock_quantity > 0
              return (
                <div key={product.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                  {/* Image Area */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-card to-muted flex items-center justify-center relative overflow-hidden">
                    <div className="size-16 rounded-2xl bg-card/70 backdrop-blur-sm flex items-center justify-center shadow-sm border border-border">
                      <Package className="size-8 text-primary/40" />
                    </div>
                    {/* Stock Overlay Badge */}
                    {!isInStock && (
                      <div className="absolute inset-0 bg-card/50 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge variant="destructive" className="text-[10px] px-3 py-1 rounded-full shadow-sm">Out of Stock</Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 flex flex-col flex-1 gap-1.5">
                    <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2">{product.name}</p>
                    {product.category && (
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{product.category}</span>
                    )}

                    {/* Price */}
                    <p className="font-bold text-lg text-foreground mt-auto">{formatCurrency(product.selling_price)}</p>

                    {/* Stock Badge */}
                    {isInStock && (
                      <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit ${stockInfo.color}`}>
                        <StockIcon className="size-3" />
                        {stockInfo.label}
                      </div>
                    )}

                    {/* Add to Cart / Quantity */}
                    <div className="mt-1">
                      {isInStock ? (
                        inCart ? (
                          <div className="flex items-center justify-between bg-primary/10 rounded-xl p-0.5 border border-primary/20">
                            <button onClick={() => { const q = inCart.quantity - 1; if (q <= 0) useCustomerCartStore.getState().removeItem(product.id); else useCustomerCartStore.getState().updateQuantity(product.id, q) }}
                              className="size-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-colors">
                              {inCart.quantity <= 1 ? <X className="size-3" /> : <Minus className="size-3" />}
                            </button>
                            <span className="text-sm font-semibold text-primary min-w-[24px] text-center">{inCart.quantity}</span>
                            <button onClick={() => handleAddToCart(product)}
                              className="size-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-colors">
                              <Plus className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleAddToCart(product)}
                            className="w-full h-9 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all duration-200 active:scale-[0.97] shadow-sm shadow-blue-200/40">
                            <ShoppingCart className="size-3.5" />
                            Add
                          </button>
                        )
                      ) : (
                        <button disabled
                          className="w-full h-9 rounded-xl bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <ShoppingCart className="size-3.5" />
                          Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-lg shadow-slate-200/50 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-blue-200">
                <ShoppingCart className="size-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {cartCount} item{cartCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">{formatCurrency(cartSubtotal)}</p>
              </div>
            </div>
            <Link href="/cart">
              <Button className="rounded-xl h-10 px-5 text-sm font-semibold shadow-sm shadow-blue-200/40 hover:shadow-md transition-all">
                View Cart <ChevronRight className="size-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function CustomerCatalog() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center"><Package className="size-10 animate-pulse mx-auto text-primary" /><p className="text-muted-foreground mt-3">Loading products...</p></div>
      </div>
    }>
      <CatalogContent />
    </Suspense>
  )
}
