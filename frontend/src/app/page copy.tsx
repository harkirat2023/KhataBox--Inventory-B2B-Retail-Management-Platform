"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { Package, Clock, CheckCircle2, XCircle, ArrowRight, ChevronRight, ShoppingBag, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerStore } from "@/store/customer-store"
import { toast } from "sonner"
import { BottomNav } from "@/components/layout/bottom-nav"

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Order {
  id: number
  order_number: string
  status: string
  payment_method: string | null
  subtotal: number
  discount: number
  gst: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

interface B2COrder {
  id: number
  order_number: string
  customer_name: string
  store_id: number
  payment_type: string
  status: string
  subtotal: number
  discount: number
  gst: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  online: { label: "Online", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  counter: { label: "Counter", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  ready: { label: "Ready", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

function OrdersContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const { selectedStore } = useCustomerStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"active" | "past">("active")

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      redirect("/login")
    }
    if (role !== "customer") {
      redirect("/dashboard")
    }
  }, [session, status, role])

  useEffect(() => {
    async function fetchOrders() {
      if (role !== "customer") return
      try {
        const data = await clientApi.get<Order[]>("/api/v1/orders/my-orders")
        setOrders(data || [])
      } catch (e) {
        console.error("Failed to load orders:", e)
        toast.error("Failed to load orders")
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [role])

  if (status === "loading" || loading || !session?.user || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center animate-pulse">
            <Package className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status))
  const pastOrders = orders.filter((o) => ["completed", "cancelled"].includes(o.status))
  const displayOrders = activeTab === "active" ? activeOrders : pastOrders

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-3 pb-3">
        <h1 className="font-bold text-lg">My Orders</h1>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 mt-4">
        <div className="bg-muted rounded-xl p-1 flex">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "active" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "past" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Past ({pastOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 mt-4 space-y-3 pb-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <div className="size-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <Package className="size-8 text-muted-foreground/30" />
            </div>
            <h2 className="font-semibold">No orders yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Your orders will appear here</p>
            <Link href={selectedStore ? `/catalog?store_id=${selectedStore.id}` : "/customer"}>
              <Button className="mt-4 rounded-xl">
                <ShoppingBag className="size-4 mr-2" />
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <div className="size-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <Package className="size-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">
              {activeTab === "active" ? "No active orders" : "No past orders"}
            </p>
          </div>
        ) : (
          displayOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending
            const StatusIcon = status.icon
            return (
              <Link key={order.id} href={`/my-orders/${order.id}`}>
                <div className="bg-white rounded-2xl border p-4 hover:shadow-md transition-shadow group">
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${status.bg} shrink-0`}>
                      <StatusIcon className={`size-5 ${status.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-semibold text-sm">{order.order_number}</p>
                        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5 truncate">
                          {order.items.map((i) => i.product_name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default function CustomerOrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center animate-pulse">
            <Package className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
