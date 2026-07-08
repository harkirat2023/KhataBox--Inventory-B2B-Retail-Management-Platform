"use client"

import { useUser } from "@clerk/nextjs"
import { redirect, useParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, LayoutDashboard, Printer, Share2, Receipt, Wallet, CreditCard } from "lucide-react"
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

interface Store {
  name: string
  address: string
  phone: string
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

const paymentLabels: Record<string, { icon: any; label: string }> = {
  credit: { icon: Wallet, label: "Pay at Shop" },
  online: { icon: CreditCard, label: "Paid Online" },
}

function ReceiptContent() {
  const { isLoaded, isSignedIn } = useUser()
  const { role } = useRole()
  const params = useParams()
  const orderId = params?.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      redirect("/login")
    }
    if (role !== "customer") {
      redirect("/dashboard")
    }
  }, [isLoaded, isSignedIn, role])

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId || role !== "customer") return
      try {
        const orderIdNum = parseInt(orderId)
        // Try B2C single order endpoint first
        try {
          const b2cOrder = await clientApi.get<any>(`/api/v1/b2c/orders/${orderIdNum}`)
          setOrder(b2cOrder)
          if (b2cOrder.store_name) {
            setStore({ name: b2cOrder.store_name, address: "", phone: "" })
          } else {
            try {
              const stores = await clientApi.get<Store[]>(`/api/v1/stores/public`)
              if (stores && stores.length > 0) {
                setStore(stores[0])
              }
            } catch {}
          }
          setLoading(false)
          return
        } catch {}

        // Fallback: legacy order
        const data = await clientApi.get<Order[]>(`/api/v1/orders/my-orders`)
        const foundOrder = data?.find((o: Order) => o.id === orderIdNum)
        if (foundOrder) {
          setOrder(foundOrder)
          try {
            const stores = await clientApi.get<Store[]>(`/api/v1/stores/public`)
            if (stores && stores.length > 0) {
              setStore(stores[0])
            }
          } catch {}
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

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (!order) return
    const text = `Receipt for Order ${order.order_number}\nTotal: ${formatCurrency(order.total)}\nPaid via: ${paymentLabels[order.payment_method]?.label || order.payment_method}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt - ${order.order_number}`,
          text,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      toast.success("Receipt info copied to clipboard")
    }
  }

  if (!isLoaded || loading || !isSignedIn || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Receipt className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading receipt...</p>
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
          <Receipt className="size-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Receipt not found</p>
        </div>
      </div>
    )
  }

  const pmtMethod = (order as any).payment_type || order.payment_method
  const paymentInfo = paymentLabels[pmtMethod] || (pmtMethod === "online" ? { icon: CreditCard, label: "Paid Online" } : { icon: Wallet, label: "Pay at Counter" })
  const PaymentIcon = paymentInfo.icon
  const receiptNumber = `RCPT-${order.id.toString().padStart(8, "0")}`

  return (
    <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href={`/my-orders/${order.id}`}>
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

      {/* Receipt Card */}
      <div className="bg-card rounded-xl border p-6 print:border-0 print:p-0">
        {/* Receipt Header */}
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold text-foreground">RECEIPT</h1>
          <p className="text-sm text-muted-foreground">{receiptNumber}</p>
        </div>

        {/* Store Info */}
        {store && (
          <div className="text-center mb-4">
            <p className="font-semibold text-foreground">{store.name}</p>
            {store.address && <p className="text-sm text-muted-foreground">{store.address}</p>}
            {store.phone && <p className="text-sm text-muted-foreground">{store.phone}</p>}
          </div>
        )}

        {/* Order Info */}
        <div className="mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Number</span>
            <span className="font-mono font-medium">{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment</span>
            <span className="flex items-center gap-1">
              <PaymentIcon className="size-3" />
              {paymentInfo.label}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-b py-4 mb-4">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-2">Item</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 text-sm">{item.product_name}</td>
                  <td className="py-1 text-sm text-right">{item.quantity}</td>
                  <td className="py-1 text-sm text-right">{formatCurrency((item as any).total ?? (item as any).total_price ?? 0)}</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-2">
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
            <span>Total Paid</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 mt-4 border-t">
          <p className="text-sm text-muted-foreground">Thank you for your purchase!</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="size-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="size-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  )
}

export default function CustomerReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Receipt className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading receipt...</p>
        </div>
      </div>
    }>
      <ReceiptContent />
    </Suspense>
  )
}