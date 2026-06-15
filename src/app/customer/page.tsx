"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingBag,
  ScanLine,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  Star,
  Flame,
} from "lucide-react"
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

interface Order {
  id: number
  order_number: string
  status: string
  total: number
  created_at: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-50" },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
  ready: { label: "Ready", color: "text-purple-600", bg: "bg-purple-50" },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
}

export default function CustomerHome() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { items } = useCustomerCartStore()

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      redirect("/login")
    }
    // For admin/shopkeeper, redirect to dashboard
    if (role && ["admin", "shopkeeper"].includes(role)) {
      redirect("/dashboard")
    }
  }, [session, status, role])

  useEffect(() => {
    if (role !== "customer") return

    async function fetchData() {
      try {
        // Fetch products (first 10 for recommendations)
        const prods = await clientApi.get<Product[]>("/api/v1/catalog/products?search=")
        setProducts(prods.slice(0, 8))

        // Fetch recent orders
        const ordRes = await clientApi.get<Order[]>("/api/v1/orders/my-orders")
        setOrders(ordRes.slice(0, 5))
      } catch (e) {
        console.error("Failed to load data:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [role])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Flame className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading KhataBox...</p>
        </div>
      </div>
    )
  }

  if (!session?.user || role !== "customer") {
    return null
  }

  const popularProducts = products.slice(0, 4)
  const recommendedProducts = products.slice(4, 8)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-6 -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-primary-foreground/90 mt-1">
          What would you like to order today?
        </p>
        <div className="flex gap-3 mt-4">
          <Link href="/catalog" className="flex-1">
            <Button variant="secondary" size="lg" className="w-full font-semibold">
              <ShoppingBag className="size-5 mr-2" />
              Browse Catalog
            </Button>
          </Link>
          <Link href="/scan" className="flex-1">
            <Button variant="secondary" size="lg" className="w-full font-semibold">
              <ScanLine className="size-5 mr-2" />
              Quick Scan
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Cart Summary */}
      {cartCount > 0 && (
        <Link href="/cart">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border hover:bg-muted/80 transition-colors">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Your Cart</p>
              <p className="text-sm text-muted-foreground">{cartCount} item{cartCount !== 1 ? "s" : ""} ready to order</p>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Recent Orders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link href="/my-orders" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-xl">
            <Package className="size-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground">No orders yet</p>
            <Link href="/catalog">
              <Button variant="outline" size="sm" className="mt-3">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending
              return (
                <Link key={order.id} href={`/my-orders/${order.id}`}>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className={`size-10 rounded-full flex items-center justify-center ${status.bg}`}>
                      {order.status === "completed" ? (
                        <CheckCircle2 className={`size-5 ${status.color}`} />
                      ) : order.status === "cancelled" ? (
                        <XCircle className={`size-5 ${status.color}`} />
                      ) : (
                        <Clock className={`size-5 ${status.color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.total)}</p>
                      <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="size-5 text-orange-500" />
              Popular Products
            </h2>
            <Link href="/catalog" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {popularProducts.map((product) => (
              <Link key={product.id} href={`/catalog?product=${product.id}`}>
                <div className="bg-muted/30 rounded-xl p-3 hover:bg-muted/50 transition-colors">
                  <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                    <Package className="size-8 text-muted-foreground/30" />
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <p className="font-semibold">{formatCurrency(product.selling_price)}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.stock_quantity > 0 ? (
                      <span className="text-green-600">In Stock</span>
                    ) : (
                      <span className="text-red-500">Out of Stock</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Products */}
      {recommendedProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="size-5 text-yellow-500" />
              Recommended for You
            </h2>
            <Link href="/catalog" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {recommendedProducts.map((product) => (
              <Link key={product.id} href={`/catalog?product=${product.id}`}>
                <div className="bg-muted/30 rounded-xl p-3 hover:bg-muted/50 transition-colors">
                  <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                    <Package className="size-8 text-muted-foreground/30" />
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <p className="font-semibold">{formatCurrency(product.selling_price)}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.stock_quantity > 0 ? (
                      <span className="text-green-600">In Stock</span>
                    ) : (
                      <span className="text-red-500">Out of Stock</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}