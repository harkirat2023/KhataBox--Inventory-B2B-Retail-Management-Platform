"use client"

import { useSession } from "next-auth/react"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, Package, ShoppingCart, Plus, X, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore } from "@/store/customer-cart"

interface Product {
  id: number
  name: string
  sku: string
  category: string
  brand: string
  selling_price: number
  stock_quantity: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

function CatalogContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])

  const { items, addItem } = useCustomerCartStore()

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) return
    if (role !== "customer") {
      window.location.href = "/dashboard"
      return
    }
  }, [session, status, role])

  useEffect(() => {
    async function fetchProducts() {
      try {
        const prods = await clientApi.get<Product[]>("/api/v1/catalog/products")
        setProducts(prods)
        setFilteredProducts(prods)
        const cats = [...new Set(prods.map((p) => p.category).filter(Boolean))]
        setCategories(cats.sort())
      } catch (e) {
        console.error("Failed to load products:", e)
      } finally {
        setLoading(false)
      }
    }
    if (role === "customer") {
      fetchProducts()
    }
  }, [role])

  useEffect(() => {
    let filtered = products
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower)
      )
    }
    if (category) {
      filtered = filtered.filter((p) => p.category === category)
    }
    setFilteredProducts(filtered)
  }, [search, category, products])

  useEffect(() => {
    const productId = searchParams.get("product")
    if (productId && products.length > 0) {
      const product = products.find((p) => p.id === parseInt(productId))
      if (product) {
        addItem({
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: product.selling_price,
          product_uuid: "",
        })
      }
    }
  }, [searchParams, products, addItem])

  if (status === "loading" || loading || !session?.user || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading products...</p>
        </div>
      </div>
    )
  }

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalog</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <LayoutDashboard className="size-4 mr-1" />
            Home
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={category === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("")}
            className="shrink-0"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat)}
              className="shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const inCart = items.find((item) => item.product_id === product.id)
            return (
              <div key={product.id} className="bg-muted/30 rounded-xl p-3 flex flex-col">
                <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center shrink-0">
                  <Package className="size-10 text-muted-foreground/30" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                  <p className="font-semibold mt-1">{formatCurrency(product.selling_price)}</p>
                </div>
                <div className="mt-2">
                  {product.stock_quantity > 0 ? (
                    inCart ? (
                      <div className="flex items-center justify-between bg-green-50 rounded-lg p-1">
                        <button
                          onClick={() => {
                            const newQty = inCart.quantity - 1
                            if (newQty <= 0) {
                              useCustomerCartStore.getState().removeItem(product.id)
                            } else {
                              useCustomerCartStore.getState().updateQuantity(product.id, newQty)
                            }
                          }}
                          className="size-7 rounded flex items-center justify-center hover:bg-muted"
                        >
                          <X className="size-3" />
                        </button>
                        <span className="text-sm font-medium">{inCart.quantity}</span>
                        <button
                          onClick={() =>
                            addItem({
                              product_id: product.id,
                              name: product.name,
                              sku: product.sku,
                              unit_price: product.selling_price,
                              product_uuid: "",
                            })
                          }
                          className="size-7 rounded flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          addItem({
                            product_id: product.id,
                            name: product.name,
                            sku: product.sku,
                            unit_price: product.selling_price,
                            product_uuid: "",
                          })
                        }
                      >
                        <ShoppingCart className="size-4 mr-1" />
                        Add
                      </Button>
                    )
                  ) : (
                    <Button size="sm" variant="secondary" disabled className="w-full">
                      Out of Stock
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cartCount > 0 && (
        <Link href="/cart">
          <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-auto z-40">
            <Button size="lg" className="w-full lg:w-auto shadow-lg">
              <ShoppingCart className="size-5 mr-2" />
              View Cart ({cartCount})
            </Button>
          </div>
        </Link>
      )}
    </div>
  )
}

export default function CustomerCatalog() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading products...</p>
        </div>
      </div>
    }>
      <CatalogContent />
    </Suspense>
  )
}