"use client"

import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, ShoppingBag, ScanLine, Loader2, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useRole } from "@/components/auth/role-guard"
import { useCustomerCartStore } from "@/store/customer-cart"
import { useCustomerStore } from "@/store/customer-store"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import { BottomNav } from "@/components/layout/bottom-nav"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

export function CartContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const router = useRouter()
  const [placing, setPlacing] = useState(false)

  const { items, removeItem, updateQuantity, clearCart, selectedStoreId } = useCustomerCartStore()
  const { selectedStore } = useCustomerStore()

  const effectiveStoreId = selectedStoreId ?? (items.length > 0 ? items[0].storeId : null)

  async function handlePlaceOrder() {
    if (placing) return
    if (items.length === 0) {
      toast.error("Cart is empty")
      return
    }
    if (!effectiveStoreId) {
      toast.error("No store selected")
      return
    }

    console.log("[Cart] Starting order placement...", { items: items.length, effectiveStoreId })
    setPlacing(true)

    try {
      const payload = {
        store_id: effectiveStoreId,
        payment_type: "online",
        discount: 0,
        notes: null,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.name,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      }

      console.log("[Cart] Validating order...")
      const validation = await clientApi.post<{ valid: boolean; issues: string[] }>("/api/v1/b2c/orders/validate", payload)
      console.log("[Cart] Validation result:", validation)

      if (!validation.valid) {
        toast.error(validation.issues.join(". "))
        setPlacing(false)
        return
      }

      console.log("[Cart] Creating order...")
      const orderResult = await clientApi.post("/api/v1/b2c/orders", payload)
      console.log("[Cart] Order created successfully:", orderResult)

      clearCart()
      toast.success("Order placed successfully!")
      // Customer should see the created B2C order in Active with B2C-pending status.
      router.push("/my-orders?tab=active")
    } catch (err: unknown) {
      console.error("[Cart] Order placement failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to place order"
      toast.error(errorMessage)
    } finally {
      setPlacing(false)
    }
  }

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) redirect("/login")
    if (role !== "customer") redirect("/dashboard")
  }, [session, status, role])

  const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
    if (newQuantity < 0) return
    if (newQuantity === 0) { removeItem(productId); return }
    updateQuantity(productId, newQuantity)
  }

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0), [items])
  const gst = useMemo(() => subtotal * 0.18, [subtotal])
  const total = useMemo(() => subtotal + gst, [subtotal, gst])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="size-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted transition-colors">
              <ArrowLeft className="size-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Shopping Cart</h1>
              {selectedStore && <p className="text-xs text-muted-foreground">{selectedStore.name}</p>}
            </div>
          </div>
          {items.length > 0 && (
            <button onClick={() => { clearCart(); toast.success("Cart cleared", { duration: 1500 }) }}
              className="h-9 px-3 rounded-xl bg-red-50 text-red-500 text-xs font-medium flex items-center gap-1.5 hover:bg-red-100 transition-colors">
              <Trash2 className="size-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3 pb-40">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center border border-border">
              <ShoppingCart className="size-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Your cart is empty</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs">Browse products and add items to get started</p>
            <div className="flex gap-2">
              <Link href={effectiveStoreId ? `/catalog?store_id=${effectiveStoreId}` : "/customer"}>
                <Button className="rounded-xl h-11"><ShoppingBag className="size-4 mr-2" /> Browse Products</Button>
              </Link>
              <Link href="/scan">
                <Button variant="outline" className="rounded-xl h-11"><ScanLine className="size-4 mr-2" /> Scan QR</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {items.map((item, idx) => (
              <div key={item.product_id}
                className="bg-card rounded-2xl border border-border p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 shadow-sm"
                style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                      </div>
                      <p className="font-bold text-sm text-foreground shrink-0">{formatCurrency(item.unit_price * item.quantity)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(item.unit_price)} each</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <button onClick={() => handleUpdateQuantity(item.product_id, 0)}
                    className="h-8 px-2.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium flex items-center gap-1 hover:bg-red-100 transition-colors">
                    <Trash2 className="size-3" /> Remove
                  </button>
                  <div className="flex items-center gap-1 bg-muted rounded-xl p-0.5 border border-border">
                    <button onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                      className="size-8 rounded-lg bg-card flex items-center justify-center hover:bg-muted transition-colors shadow-sm">
                      {item.quantity <= 1 ? <Trash2 className="size-3 text-red-400" /> : <Minus className="size-3 text-muted-foreground" />}
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                      className="size-8 rounded-lg bg-card flex items-center justify-center hover:bg-muted transition-colors shadow-sm">
                      <Plus className="size-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Checkout Footer */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-[60] bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
          <div className="px-4 pt-3 pb-4 max-w-lg mx-auto">
            <div className="bg-muted rounded-2xl p-4 mb-3 space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST (18%)</span><span className="font-medium text-foreground">{formatCurrency(gst)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span className="text-foreground">Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>
            <Button onClick={handlePlaceOrder} disabled={placing}
              className="w-full h-12 rounded-xl font-semibold text-base shadow-lg shadow-blue-200/40 hover:shadow-xl hover:shadow-blue-300/50 transition-all duration-200 active:scale-[0.99]">
              {placing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Package className="size-4 mr-2" />}
              {placing ? "Placing Order..." : "Place Order"}
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
