"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Search, Package, QrCode, Plus, Minus, ShoppingCart, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import { useCartStore } from "@/store/cart"

interface ProductInfo {
  id: number
  product_uuid: string
  name: string
  sku: string
  stock_quantity: number
  store_name: string | null
  category: string
  selling_price: number
}

interface CartItem {
  product_id: number
  name: string
  sku: string
  unit_price: number
  quantity: number
}

type ActionType = "add" | "remove" | "adjust"

export default function CustomerScanPage() {
  const [scannedUuid, setScannedUuid] = useState("")
  const [manualUuid, setManualUuid] = useState("")
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [action, setAction] = useState<ActionType>("add")
  const [submitting, setSubmitting] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)

  const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore()

  const lookUpProduct = async (uuid: string) => {
    setLoading(true)
    setProduct(null)
    setQuantity(1)
    try {
      // Use catalog endpoint for customer-facing product lookup (doesn't filter by owner)
      const data = await clientApi.get<ProductInfo>(`/api/v1/catalog/by-uuid/${uuid}`)
      setProduct({ ...data, product_uuid: uuid })
      setScannedUuid(uuid)
    } catch {
      // Fallback to shopkeeper endpoint if catalog fails (for testing)
      try {
        const data = await clientApi.get<ProductInfo>(`/api/v1/products/by-uuid/${uuid}`)
        setProduct({ ...data, product_uuid: uuid })
        setScannedUuid(uuid)
      } catch {
        toast.error("Product not found for this QR code")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const uuid = manualUuid.trim()
    if (!uuid) return
    lookUpProduct(uuid)
  }

  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
      }
      const scannerId = "qr-scanner-element"
      if (!document.getElementById(scannerId)) {
        const div = document.createElement("div")
        div.id = scannerId
        scannerRef.current?.appendChild(div)
      }
      const html5QrCode = new Html5Qrcode(scannerId)
      html5QrCodeRef.current = html5QrCode
      setCameraError(null)
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          lookUpProduct(decodedText.trim())
        },
        () => {},
      )
      setCameraActive(true)
    } catch (err: any) {
      setCameraError(err?.message || "Camera access denied")
      setCameraActive(false)
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch {}
      html5QrCodeRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const handleAddToCart = async () => {
    if (!product) return

    setSubmitting(true)
    try {
      const cartItem = {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
        quantity,
      }

      // Use customer-cart API
      await clientApi.post("/api/v1/cart/items", { items: [cartItem] })

      // Also add to local store for display
      addItem({ product_id: product.id, name: product.name, sku: product.sku, unit_price: product.selling_price }, quantity)

      toast.success(`${product.name}: Added ${quantity} to cart`)

      setProduct(null)
      setScannedUuid("")
      setManualUuid("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to add to cart")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateCart = async () => {
    if (!product) return

    setSubmitting(true)
    try {
      // Get active cart first, then update
      const carts = await clientApi.get<any[]>("/api/v1/cart/")
      if (carts && carts.length > 0) {
        const activeCart = carts.find((c: any) => c.status === "ACTIVE")
        if (activeCart) {
          const item = activeCart.items?.find((i: any) => i.product_id === product.id)
          if (item) {
            await clientApi.put(`/api/v1/cart/${activeCart.id}/items/${item.id}?quantity=${quantity}`, {})
          }
        }
      }

      updateQuantity(product.id, quantity)

      toast.success(`${product.name}: Cart updated to ${quantity}`)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update cart")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveFromCart = async () => {
    if (!product) return

    setSubmitting(true)
    try {
      // Get active cart first, then remove
      const carts = await clientApi.get<any[]>("/api/v1/cart/")
      if (carts && carts.length > 0) {
        const activeCart = carts.find((c: any) => c.status === "ACTIVE")
        if (activeCart) {
          const item = activeCart.items?.find((i: any) => i.product_id === product.id)
          if (item) {
            await clientApi.delete(`/api/v1/cart/${activeCart.id}/items/${item.id}`)
          }
        }
      }

      removeItem(product.id)

      toast.success(`${product.name}: Removed from cart`)

      setProduct(null)
      setScannedUuid("")
      setManualUuid("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove from cart")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckout = async () => {
    setSubmitting(true)
    try {
      // Use customer-cart checkout API
      await clientApi.post("/api/v1/cart/checkout", {
        payment_method: "credit",
        notes: "Customer scan checkout",
      })

      clearCart()
      toast.success("Order placed successfully!")
    } catch (err: any) {
      toast.error(err?.message || "Failed to checkout")
    } finally {
      setSubmitting(false)
    }
  }

  const actionConfig: Record<ActionType, { icon: any; label: string; variant: "default" | "secondary" | "destructive" }> = {
    add: { icon: Plus, label: "Add to Cart", variant: "default" },
    remove: { icon: Minus, label: "Remove from Cart", variant: "destructive" },
    adjust: { icon: Package, label: "Set Cart Quantity", variant: "secondary" },
  }

  const isInCart = product ? items.some(item => item.product_id === product.id) : false

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Customer Product Scan</h1>
        <Badge variant="outline" className="text-xs gap-1">
          <ShoppingCart className="size-3" />
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Camera className="size-4" />
                Scan Product QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={scannerRef}
                className="relative aspect-video rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center"
              >
                {!cameraActive && !cameraError && (
                  <div className="text-center text-slate-400 p-8">
                    <QrCode className="size-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Point camera at a product QR code</p>
                  </div>
                )}
                {cameraError && (
                  <div className="text-center text-red-500 p-8">
                    <CameraOff className="size-12 mx-auto mb-3 opacity-60" />
                    <p className="text-sm">{cameraError}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!cameraActive ? (
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200 flex-1" onClick={startCamera}>
                    <Camera className="size-4 mr-1.5" />
                    Start Camera
                  </Button>
                ) : (
                  <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200 flex-1" onClick={stopCamera}>
                    <CameraOff className="size-4 mr-1.5" />
                    Stop Camera
                  </Button>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-400">or enter UUID manually</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                <Input
                  placeholder="Paste product UUID..."
                  value={manualUuid}
                  onChange={(e) => setManualUuid(e.target.value)}
                  className="rounded-xl border-slate-200 h-11"
                />
                <Button type="submit" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl size-11 transition-all duration-200" disabled={!manualUuid.trim()}>
                  <Search className="size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {loading && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="py-8 space-y-4">
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="size-5 animate-spin" />
                  <span>Looking up product...</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {product && !loading && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Package className="size-4" />
                  {product.name}
                  {isInCart && (
                    <Badge variant="outline" className="ml-auto text-xs">In Cart</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">SKU</span>
                    <p className="font-mono font-medium text-slate-900">{product.sku}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Category</span>
                    <p className="font-medium text-slate-900">{product.category}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Price</span>
                    <p className="text-lg font-bold text-slate-900">₹{product.selling_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Available</span>
                    <p className="text-lg font-bold text-slate-900">{product.stock_quantity}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">Store</span>
                    <p className="font-medium text-slate-900">{product.store_name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 mb-1.5 block">UUID</span>
                    <p className="font-mono text-xs text-slate-500">{product.product_uuid}</p>
                  </div>
                </div>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Cart Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {(["add", "remove", "adjust"] as ActionType[]).map((a) => {
                        const cfg = actionConfig[a]
                        const Icon = cfg.icon
                        const isActive = action === a
                        const activeClass = a === "remove"
                          ? "bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5 transition-all duration-200"
                          : a === "adjust"
                            ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200"
                            : "bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200"
                        const inactiveClass = "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200"
                        return (
                          <Button
                            key={a}
                            onClick={() => setAction(a)}
                            className={isActive ? activeClass : inactiveClass}
                          >
                            <Icon className="size-4 mr-1" />
                            {cfg.label}
                          </Button>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                          {action === "add"
                            ? "Quantity to add"
                            : action === "remove"
                              ? "Quantity to remove"
                              : "New cart quantity"}
                        </label>
                        <Input
                          type="number"
                          min={action === "remove" ? 1 : 0}
                          max={action === "add" ? product.stock_quantity : undefined}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                          className="rounded-xl border-slate-200 h-11"
                        />
                      </div>
                      <div className="pt-5">
                        <Button
                          size="lg"
                          onClick={action === "add" ? handleAddToCart : action === "remove" ? handleRemoveFromCart : handleUpdateCart}
                          disabled={submitting || (action === "add" && quantity > product.stock_quantity)}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200"
                        >
                          {submitting ? "Processing..." : action === "add" ? "Add to Cart" : action === "remove" ? "Remove from Cart" : "Update Cart"}
                        </Button>
                      </div>
                    </div>

                    {action === "add" && quantity > product.stock_quantity && (
                      <p className="text-xs text-red-500">
                        Cannot add more than available stock ({product.stock_quantity})
                      </p>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {!product && !loading && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="py-16 text-center">
                <QrCode className="size-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Scan a Product</h3>
                <p className="text-sm text-slate-500">Point camera at a product QR code or enter a UUID to begin</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {items.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <ShoppingCart className="size-4" />
                  Cart ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">₹{item.unit_price.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">x{item.quantity}</p>
                    </div>
                    <div className="text-right font-medium text-slate-900">
                      ₹{(item.unit_price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}

                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>GST (18%):</span>
                    <span>₹{items.reduce((sum, item) => sum + item.unit_price * item.quantity * 0.18, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t border-slate-200 pt-2 text-slate-900">
                    <span>Total:</span>
                    <span>₹{items.reduce((sum, item) => sum + item.unit_price * item.quantity * 1.18, 0).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200 w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? "Processing..." : "Checkout"}
                </Button>
              </CardContent>
            </Card>
          )}

          {items.length === 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="py-16 text-center">
                <ShoppingCart className="size-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Your cart is empty</h3>
                <p className="text-sm text-slate-500">Scan products to add them to your cart</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
