"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Package, Clock, CheckCircle2, XCircle, ArrowRight, LayoutDashboard, Receipt, FileText, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

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
  payment_method: string
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

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  ready: { label: "Ready", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

const paymentLabels: Record<string, string> = {
  credit: "Pay at Shop",
  online: "Paid Online",
}

function OrdersContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading orders...</p>
        </div>
      </div>
    )
  }

  // Group orders by status
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status))
  const pastOrders = orders.filter((o) => ["completed", "cancelled"].includes(o.status))

  return (
    <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <LayoutDashboard className="size-4 mr-1" />
            Home
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="size-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No orders yet</p>
          <p className="text-sm mt-1 mb-4">Your order history will appear here</p>
          <Link href="/catalog">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      )}

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Active Orders</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending
              const StatusIcon = status.icon
              return (
                <Link key={order.id} href={`/my-orders/${order.id}`}>
                  <div className="bg-card rounded-xl border p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center ${status.bg}`}>
                        <StatusIcon className={`size-5 ${status.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-mono font-semibold">{order.order_number}</p>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs font-medium ${status.color}`}>
                            {status.label}
                          </p>
                          <p className="font-semibold">{formatCurrency(order.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Past Orders</h2>
          <div className="space-y-3">
            {pastOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.completed
              const StatusIcon = status.icon
              return (
                <Link key={order.id} href={`/my-orders/${order.id}`}>
                  <div className="bg-card rounded-xl border p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center ${status.bg}`}>
                        <StatusIcon className={`size-5 ${status.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-mono font-semibold">{order.order_number}</p>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs font-medium ${status.color}`}>
                            {status.label}
                          </p>
                          <p className="font-semibold">{formatCurrency(order.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default function CustomerOrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading orders...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}