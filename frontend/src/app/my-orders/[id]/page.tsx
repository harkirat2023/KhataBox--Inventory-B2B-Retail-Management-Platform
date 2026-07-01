"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Package, Clock, CheckCircle2, XCircle, ArrowLeft, ArrowRight, LayoutDashboard, Receipt, FileText, Printer, Share2, Wallet, CreditCard } from "lucide-react"
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

const statusSteps = [
  { key: "pending", label: "Order Placed", description: "Your order has been received" },
  { key: "confirmed", label: "Confirmed", description: "Order is being processed" },
  { key: "ready", label: "Ready", description: "Order is ready for pickup" },
  { key: "completed", label: "Completed", description: "Order picked up" },
]

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  ready: { label: "Ready", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

const paymentLabels: Record<string, { icon: any; label: string }> = {
  credit: { icon: Wallet, label: "Pay at Shop" },
  online: { icon: CreditCard, label: "Paid Online" },
}

function OrderDetailContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id") || useSearchParams().get("id")
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
        const data = await clientApi.get<Order[]>(`/api/v1/orders/my-orders`)
        const foundOrder = data?.find((o: Order) => o.id === parseInt(orderId))
        if (foundOrder) {
          setOrder(foundOrder)
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <Link href="/my-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Package className="size-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Order not found</p>
        </div>
      </div>
    )
  }

  const statusCfg = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = statusCfg.icon
  const paymentInfo = paymentLabels[order.payment_method] || paymentLabels.credit
  const PaymentIcon = paymentInfo.icon

  // Calculate step index
  const currentStep = statusSteps.findIndex((s) => s.key === order.status)
  const isPastOrder = ["completed", "cancelled"].includes(order.status)

  return (
    <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/my-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Button>
        </Link>
        <Link href="/" className="ml-auto">
          <Button variant="ghost" size="sm">
            <LayoutDashboard className="size-4 mr-1" />
            Home
          </Button>
        </Link>
      </div>

      {/* Order Status Card */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="text-xl font-mono font-bold">{order.order_number}</p>
          </div>
          <div className={`px-3 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color} text-sm font-medium`}>
            <StatusIcon className="size-4 inline mr-1" />
            {statusCfg.label}
          </div>
        </div>

        {/* Progress Steps */}
        {!isPastOrder && (
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 z-0" />
            <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0" style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }} />
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStep
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`size-8 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="size-4" /> : <span className="text-xs">{index + 1}</span>}
                  </div>
                  <p className={`text-xs mt-1 ${isCompleted ? "font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Order Details */}
      <div className="bg-card rounded-xl border p-4">
        <h2 className="font-semibold mb-3">Order Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="flex items-center gap-1">
              <PaymentIcon className="size-3" />
              {paymentInfo.label}
            </span>
          </div>
          {order.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notes</span>
              <span>{order.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border p-4">
        <h2 className="font-semibold mb-3">Items ({order.items?.length || 0})</h2>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} x {formatCurrency(item.unit_price)}
                </p>
              </div>
              <p className="font-medium">{formatCurrency(item.total_price)}</p>
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
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/receipts/${order.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <Receipt className="size-4 mr-2" />
            View Receipt
          </Button>
        </Link>
        <Link href="/catalog" className="flex-1">
          <Button className="w-full">
            Order Again
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading order...</p>
        </div>
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  )
}