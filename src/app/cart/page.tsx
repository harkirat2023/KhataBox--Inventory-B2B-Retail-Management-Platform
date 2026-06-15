"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, ArrowRight, CreditCard, Wallet, CheckCircle2, Package, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore, CustomerCartItem } from "@/store/customer-cart"
import { toast } from "sonner"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

interface CartServerItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  unit_price: number
  quantity: number
  total_price: number
}

interface ServerCart {
  id: number
  status: string
  subtotal: number
  discount: number
  gst: number
  total: number
  items: CartServerItem[]
}

function CartContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const searchParams = useSearchParams()
  const [serverCart, setServerCart] = useState<ServerCart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<"credit" | "online">("credit")
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderResult, setOrderResult] = useState<any>(null)

  const { items, removeItem, updateQuantity, clearCart, syncWithServer } = useCustomerCartStore()

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
    async function fetchCart() {
      if (role !== "customer") return
      try {
        const carts = await clientApi.get<ServerCart[]>("/api/v1/customer-cart/")
        const activeCart = carts?.find((c: ServerCart) => c.status === "ACTIVE")
        if (activeCart) {
          setServerCart(activeCart)
          syncWithServer(activeCart.items.map((item) => ({
            product_id: item.product_id,
            name: item.product_name,
            sku: item.sku,
            unit_price: item.unit_price,
            quantity: item.quantity,
            product_uuid: "",
          })))
        }
      } catch (e) {
        console.error("Failed to load cart:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchCart()
  }, [role])

  const handleRemoveItem = async (productId: number) => {
    if (!serverCart) return
    setSubmitting(true)
    try {
      await clientApi.delete(`/api/v1/customer-cart/${serverCart.id}/items/${productId}`)
      removeItem(productId)
      toast.success("Item removed from cart")
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove item")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateQuantity = async (productId: number, newQty: number) => {
    if (!serverCart) return
    if (newQty <= 0) {
      handleRemoveItem(productId)
      return
    }
    try {
      const item = serverCart.items.find((i) => i.product_id === productId)
      if (item) {
        await clientApi.put(`/api/v1/customer-cart/${serverCart.id}/items/${item.id}?quantity=${newQty}`, {})
        updateQuantity(productId, newQty)
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update quantity")
    }
  }

  const handleCheckout = async () => {
    setCheckingOut(true)
    try {
      const result = await clientApi.post<any>("/api/v1/customer-cart/checkout", {
        payment_method: selectedPayment,
        notes: "Customer checkout",
      })
      setOrderResult(result.order)
      setOrderPlaced(true)
      clearCart()
      toast.success("Order placed successfully!")
    } catch (e: any) {
      toast.error(e?.message || "Failed to place order")
    } finally {
      setCheckingOut(false)
    }
  }

  if (status === "loading" || loading || !session?.user || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ShoppingCart className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading cart...</p>
        </div>
      </div>
    )
  }

  const displayItems = items.length > 0 ? items : (serverCart?.items || []).map((item) => ({
    product_id: item.product_id,
    name: item.product_name,
    sku: item.sku,
    unit_price: item.unit_price,
    quantity: item.quantity,
    product_uuid: "",
  }))

  const subtotal = serverCart?.subtotal || displayItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const gst = serverCart?.gst || subtotal * 0.18
  const total = serverCart?.total || subtotal + gst

  if (orderPlaced && orderResult) {
    return (
      <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6">
        <div className="text-center py-8">
          <CheckCircle2 className="size-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold">Order Placed!</h1>
          <p className="text-muted-foreground mt-2">Your order has been confirmed</p>
        </div>

        <div className="bg-card rounded-xl border p-4 text-left">
          <p className="text-sm text-muted-foreground">Order Number</p>
          <p className="text-xl font-mono font-bold">{orderResult.order_number}</p>
        </div>

        <div className="bg-card rounded-xl border p-4 text-left">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(orderResult.total)}</p>
        </div>

        <div className="flex gap-2">
          <Link href="/my-orders" className="flex-1">
            <Button className="w-full">
              View Orders
            </Button>
          </Link>
          <Link href="/catalog" className="flex-1">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6 pb-28 lg:pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-1" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Your Cart</h1>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <LayoutDashboard className="size-4 mr-1" />
            Home
          </Button>
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="size-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Your cart is empty</p>
          <p className="text-sm mt-1 mb-4">Scan products to add them to your cart</p>
          <Link href="/catalog">
            <Button>Browse Catalog</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item: any) => (
            <div key={item.product_id} className="flex items-center gap-3 p-3 bg-card rounded-xl border">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">{item.sku}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => {
                    const newQty = item.quantity - 1
                    if (newQty <= 0) {
                      handleRemoveItem(item.product_id)
                    } else {
                      handleUpdateQuantity(item.product_id, newQty)
                    }
                  }}
                >
                  {item.quantity <= 1 ? <Trash2 className="size-3" /> : <Minus className="size-3" />}
                </Button>
                <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>

              <div className="text-right w-20">
                <p className="font-semibold">{formatCurrency(item.unit_price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {displayItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:relative lg:border-0 lg:p-0">
          <div className="bg-card rounded-xl border p-4 space-y-4">
            {/* Payment Method */}
            <div>
              <p className="text-sm font-medium mb-2">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedPayment("credit")}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    selectedPayment === "credit"
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  <Wallet className="size-5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Pay at Shop</p>
                    <p className="text-xs text-muted-foreground">Pay when you pick up</p>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPayment("online")}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    selectedPayment === "online"
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  <CreditCard className="size-5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Pay Online</p>
                    <p className="text-xs text-muted-foreground">Card/UPI</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>{formatCurrency(gst)}</span>
              </div>
              <div className="flex justify-between font-bold text-xl pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={checkingOut || displayItems.length === 0}
            >
              {checkingOut ? (
                "Processing..."
              ) : (
                <>
                  Place Order
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CustomerCartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ShoppingCart className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading cart...</p>
        </div>
      </div>
    }>
      <CartContent />
    </Suspense>
  )
}