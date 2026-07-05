"use client"

import { useSession } from "next-auth/react"
import { redirect, useParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { Package, Clock, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Wallet, CreditCard, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerStore } from "@/store/customer-store"
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

const statusSteps = [
  { key: "pending", label: "Order Placed", description: "Your order has been received" },
  { key: "confirmed", label: "Approved", description: "Shopkeeper has approved your order" },
  { key: "completed", label: "Received", description: "Order fulfilled and completed" },
]

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  online: { label: "Online", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  counter: { label: "In-Store", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  ready: { label: "Ready", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  completed: { label: "Received", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  received: { label: "Received", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

const paymentLabels: Record<string, { icon: LucideIcon; label: string }> = {
  credit: { icon: Wallet, label: "Pay at Shop" },
  online: { icon: CreditCard, label: "Paid Online" },
}

function OrderDetailContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const params = useParams()
  const orderId = params?.id as string
  const { selectedStore } = useCustomerStore()
  const [order, setOrder] = useState<Order | null>(null)
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
    async function fetchOrder() {
      if (!orderId || role !== "customer") return
      try {
        const orderIdNum = parseInt(orderId)
        // Try B2C single order endpoint first
        try {
          const b2cOrder = await clientApi.get<Order>(`/api/v1/b2c/orders/${orderIdNum}`)
          setOrder(b2cOrder)
          setLoading(false)
          return
        } catch {}

        // Fallback: search in legacy orders
        const legacyRes = await clientApi.get<Order[]>("/api/v1/orders/my-orders")
        const found = legacyRes.find((o) => o.id === orderIdNum) || null
        if (found) {
          setOrder(found)
        } else {
          toast.error("Order not found")
        }
      } catch (e) {
        console.error("Failed to load order:", e)
        toast.error("Failed to load order")
      } finally {
        setLoading(false)
      }
    }
    if (orderId) {
      fetchOrder()
    } else {
      setLoading(false)
    }
  }, [orderId, role])

  if (status === "loading" || loading || !session?.user || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center animate-pulse">
            <Package className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4">
        <Link href="/my-orders">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="size-4 mr-1" />
            Back to Orders
          </Button>
        </Link>
        <div className="bg-white rounded-2xl border p-8 text-center">
          <Package className="size-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold">Order not found</p>
        </div>
      </div>
    )
  }

  // For B2C completed orders, show "received" status to customer
  const displayStatus = order.status === "completed" && order.order_number?.startsWith("B2C-") ? "received" : order.status
  const statusCfg = statusConfig[displayStatus] || statusConfig.pending
  const StatusIcon = statusCfg.icon
  const paymentInfo = paymentLabels[order.payment_method] || paymentLabels.credit
  const PaymentIcon = paymentInfo.icon
  const currentStep = statusSteps.findIndex((s) => s.key === (displayStatus === "received" ? "completed" : displayStatus))
  const isPastOrder = ["completed", "cancelled"].includes(order.status)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-8">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/my-orders">
            <Button variant="ghost" size="sm" className="h-8">
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Order Details</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="text-lg font-mono font-bold mt-0.5">{order.order_number}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full ${statusCfg.bg} ${statusCfg.color} text-xs font-semibold flex items-center gap-1`}>
              <StatusIcon className="size-3.5" />
              {statusCfg.label}
            </div>
          </div>

          {/* Progress Steps */}
          {!isPastOrder && order.status !== "cancelled" && (
            <div className="flex items-center justify-between relative mt-6">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 z-0" />
              <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all" style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }} />
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStep
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div className={`size-8 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="size-4" /> : <span className="text-xs font-medium">{index + 1}</span>}
                    </div>
                    <p className={`text-[10px] mt-1.5 font-medium text-center ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {order.status === "cancelled" && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl flex items-center gap-2">
              <XCircle className="size-4 text-red-500" />
              <p className="text-sm text-red-700 font-medium">This order has been cancelled</p>
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold text-sm mb-3">Order Information</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(order.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium flex items-center gap-1">
                <PaymentIcon className="size-3.5" />
                {paymentInfo.label}
              </span>
            </div>
            {order.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="text-right max-w-[200px]">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold text-sm mb-3">Items ({order.items?.length || 0})</h2>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                  <Package className="size-5 text-primary/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-semibold text-sm">{formatCurrency(item.total_price)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.gst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>{formatCurrency(order.gst)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/receipts/${order.id}`} className="flex-1">
            <Button variant="outline" className="w-full rounded-xl h-11">
              <Package className="size-4 mr-2" />
              View Receipt
            </Button>
          </Link>
          <Link href={selectedStore ? `/catalog?store_id=${selectedStore.id}` : "/catalog"} className="flex-1">
            <Button className="w-full rounded-xl h-11">
              Order Again
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center animate-pulse">
            <Package className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  )
}
