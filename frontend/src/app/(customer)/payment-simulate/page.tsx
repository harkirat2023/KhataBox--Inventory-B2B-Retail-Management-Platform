"use client"

import { useSession } from "next-auth/react"
import { redirect, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { CreditCard, CheckCircle2, XCircle, ArrowLeft, Loader2, ShoppingCart, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore } from "@/store/customer-cart"
import { useCustomerStore } from "@/store/customer-store"
import { toast } from "sonner"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

function PaymentContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedStore } = useCustomerStore()

  const cartId = searchParams.get("cart_id")
  const totalParam = searchParams.get("total")

  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [processing, setProcessing] = useState(false)
  const [paymentDone, setPaymentDone] = useState(false)
  const [paymentError, setPaymentError] = useState("")

  const { clearCart } = useCustomerCartStore()

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      redirect("/login")
    }
    if (role !== "customer") {
      redirect("/dashboard")
    }
  }, [session, status, role])

  const totalAmount = totalParam ? parseFloat(totalParam) : 0

  const handlePay = async () => {
    setProcessing(true)
    setPaymentError("")

    try {
      const simResult = await clientApi.post<any>("/api/v1/payment/simulate", {
        amount: totalAmount,
        payment_method: "upi",
      })

      if (!simResult.success) {
        setPaymentError("Payment failed. Please try again.")
        setProcessing(false)
        return
      }

      const result = cartId
        ? await clientApi.post<any>(`/api/v1/cart/${cartId}/checkout`, {
            payment_method: "upi",
            notes: "Online payment via simulated gateway",
          })
        : await clientApi.post<any>("/api/v1/cart/checkout", {
            payment_method: "upi",
            notes: "Online payment via simulated gateway",
          })

      setPaymentDone(true)
      clearCart()
      toast.success("Payment successful! Order placed.")
    } catch (e: any) {
      setPaymentError(e?.message || "Payment processing failed")
    } finally {
      setProcessing(false)
    }
  }

  if (status === "loading" || !session?.user || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <Loader2 className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!cartId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="text-center space-y-4">
          <XCircle className="size-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Invalid Request</h1>
          <p className="text-muted-foreground">No cart information found</p>
          <Link href="/cart">
            <Button className="rounded-xl">Back to Cart</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (paymentDone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="size-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">Your order has been placed and is being processed.</p>
          {selectedStore && (
            <p className="text-sm text-muted-foreground">
              Store: <span className="font-medium">{selectedStore.name}</span>
            </p>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <Link href="/my-orders">
              <Button className="rounded-xl">View Orders</Button>
            </Link>
            <Link href="/customer">
              <Button variant="outline" className="rounded-xl">Home</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/cart">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl border p-4 space-y-2 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Order Total</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          {selectedStore && (
            <p className="text-xs text-muted-foreground">{selectedStore.name}</p>
          )}
        </div>

        {/* Payment Form */}
        <div className="bg-card rounded-2xl border p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="size-5 text-primary" />
            <h2 className="font-semibold">Simulated Card Payment</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Card Number</label>
            <Input
              placeholder="4111 1111 1111 1111"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Cardholder Name</label>
            <Input
              placeholder="John Doe"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Expiry</label>
              <Input
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                maxLength={5}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">CVV</label>
              <Input
                type="password"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                maxLength={4}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {paymentError && (
            <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2">
              <XCircle className="size-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{paymentError}</p>
            </div>
          )}

          <Button
            className="w-full h-12 rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
            onClick={handlePay}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="size-4 mr-2" />
                Pay {formatCurrency(totalAmount)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="size-3" />
            Simulated gateway — no real transaction
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSimulatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <Loader2 className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading payment...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}
