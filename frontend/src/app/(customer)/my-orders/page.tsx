"use client"

import { useUser } from "@clerk/nextjs"
import { redirect, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { Package, Clock, CheckCircle2, XCircle, ChevronRight, ShoppingBag, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerStore } from "@/store/customer-store"
import { toast } from "sonner"
import { BottomNav } from "@/components/layout/bottom-nav"

interface OrderItem {
  id: number; product_id: number; product_name: string; quantity: number; unit_price: number; total_price: number
}
interface Order {
  id: number; order_number: string; status: string; payment_method: string | null
  subtotal: number; discount: number; gst: number; total: number
  notes: string | null; created_at: string; updated_at: string; items: OrderItem[]; store_name?: string | null
}
interface B2COrder {
  id: number; order_number: string; customer_name: string; store_id: number; store_name: string | null
  payment_type: string; status: string; subtotal: number; discount: number; gst: number; total: number
  notes: string | null; created_at: string; updated_at: string; items: OrderItem[]
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  pending: { label: "B2C-Pending", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  received: { label: "Received", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
  rejected: { label: "Rejected", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

function OrdersContent() {
  const { isLoaded, isSignedIn } = useUser()
  const { role } = useRole()
  const params = useSearchParams()
  const { selectedStore } = useCustomerStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"active" | "past">(params.get("tab") === "past" ? "past" : "active")

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) redirect("/login")
    if (role !== "customer") redirect("/dashboard")
  }, [isLoaded, isSignedIn, role])

  useEffect(() => {
    async function fetchOrders() {

      if (role !== "customer") return
      setLoading(true)
      try {
        const [legacyOrders, b2cOrders] = await Promise.allSettled([
          clientApi.get<Order[]>("/api/v1/orders/my-orders"),
          clientApi.get<B2COrder[]>("/api/v1/b2c/orders"),
        ])

        const merged: Order[] = []
        if (legacyOrders.status === "fulfilled") {
          merged.push(
            ...legacyOrders.value.map((o) => ({ ...o, payment_method: o.payment_method || "online" }))
          )
        }

        if (b2cOrders.status === "fulfilled") {
          merged.push(
            ...b2cOrders.value.map((o) => ({
              id: o.id,
              order_number: o.order_number,
              status: o.status,
              payment_method: o.payment_type,
              subtotal: o.subtotal,
              discount: o.discount,
              gst: o.gst,
              total: o.total,
              notes: o.notes,
              created_at: o.created_at,
              updated_at: o.updated_at,
              items: o.items || [],
              store_name: o.store_name,
            }))
          )
        }

        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setOrders(merged)
      } catch (e) {
        console.error("Failed to load orders:", e)
        toast.error("Failed to load orders")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
    return () => {}
  }, [role])

  if (!isLoaded || loading || !isSignedIn || role !== "customer") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Package className="size-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  const activeOrders = orders.filter((o) => !["completed", "cancelled", "rejected"].includes(o.status))
  const pastOrders = orders.filter((o) => ["completed", "cancelled", "rejected"].includes(o.status))
  const displayOrders = activeTab === "active" ? activeOrders : pastOrders

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-foreground">My Orders</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="bg-muted rounded-2xl p-1 flex">
          <button onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === "active" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}>
            Active ({activeOrders.length})
          </button>
          <button onClick={() => setActiveTab("past")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === "past" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}>
            Past ({pastOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 mt-4 space-y-3 pb-4">
        {orders.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
            <div className="size-16 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="size-8 text-muted-foreground" />
            </div>
            <h2 className="font-semibold text-foreground">No orders yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Your orders will appear here</p>
            <Link href={selectedStore ? `/catalog?store_id=${selectedStore.id}` : "/customer"}>
              <Button className="mt-4 rounded-xl"><ShoppingBag className="size-4 mr-2" />Start Shopping</Button>
            </Link>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
            <div className="size-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {activeTab === "active" ? "No active orders" : "No past orders"}
            </p>
          </div>
        ) : (
          displayOrders.map((order) => {
            // Show "Received" for completed B2C orders
            const displayStatus = order.status === "completed" && order.order_number?.startsWith("B2C-") ? "received" : order.status
            const s = statusConfig[displayStatus] || statusConfig.pending
            const StatusIcon = s.icon
            return (
              <Link key={order.id} href={`/my-orders/${order.id}`}>
                <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-lg hover:border-border transition-all duration-200 group shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${s.bg} shrink-0`}>
                      <StatusIcon className={`size-5 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-semibold text-sm text-foreground">{order.order_number}</p>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                        <span className="font-bold text-sm text-foreground">{formatCurrency(order.total)}</span>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5 truncate">
                          {order.items.map((i) => i.product_name).join(", ")}
                        </p>
                      )}
                      {order.store_name && (
                        <p className="text-[10px] text-muted-foreground mt-1">{order.store_name}</p>
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Package className="size-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
