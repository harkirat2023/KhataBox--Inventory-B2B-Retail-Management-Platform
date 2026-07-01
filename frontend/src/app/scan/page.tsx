"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useRef, useState, Suspense } from "react"
import Link from "next/link"
import { Camera, CameraOff, Search, Package, QrCode, Plus, Minus, ShoppingCart, X, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore } from "@/store/customer-cart"
import { toast } from "sonner"

interface ProductInfo {
  id: number
  product_uuid: string
  name: string
  sku: string
  stock_quantity: number
  category: string
  selling_price: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
}

function ScanContent() {
  const { data: session, status } = useSession()
  const { role } = useRole()
  const [scannedUuid, setScannedUuid] = useState("")
  const [manualUuid, setManualUuid] = useState("")
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)

  const { items, addItem } = useCustomerCartStore()

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      redirect("/login")
    }
    if (role !== "customer") {
      redirect("/dashboard")
    }
  }, [session, status, role])

  const lookUpProduct = async (uuid: string) => {
    setLoading(true)
    setProduct(null)
    setQuantity(1)
    try {
      const data = await clientApi.get<ProductInfo>(`/api/v1/catalog/by-uuid/${uuid}`)
      setProduct({ ...data, product_uuid: uuid })
      setScannedUuid(uuid)
    } catch {
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
      addItem({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
        product_uuid: product.product_uuid,
      }, quantity)
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

  if (status === "loading" || !session?.user || role !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <QrCode className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  const isInCart = product ? items.some(item => item.product_id === product.id) : false

  return (
    <div className="space-y-4 -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quick Scan</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <LayoutDashboard className="size-4 mr-1" />
            Home
          </Button>
        </Link>
      </div>

      {/* Scanner */}
      <div className="bg-card rounded-xl border p-4">
        <div
          ref={scannerRef}
          className="relative aspect-video rounded-lg bg-muted overflow-hidden flex items-center justify-center mb-4"
        >
          {!cameraActive && !cameraError && (
            <div className="text-center text-muted-foreground p-8">
              <QrCode className="size-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Point camera at product QR code</p>
            </div>
          )}
          {cameraError && (
            <div className="text-center text-destructive p-8">
              <CameraOff className="size-12 mx-auto mb-3 opacity-60" />
              <p className="text-sm">{cameraError}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          {!cameraActive ? (
            <Button onClick={startCamera} className="flex-1">
              <Camera className="size-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <Button variant="outline" onClick={stopCamera} className="flex-1">
              <CameraOff className="size-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or enter UUID manually</span>
          </div>
        </div>

        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <Input
            placeholder="Paste product UUID..."
            value={manualUuid}
            onChange={(e) => setManualUuid(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!manualUuid.trim()}>
            <Search className="size-4" />
          </Button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          <QrCode className="size-8 animate-spin mx-auto mb-2" />
          <p>Looking up product...</p>
        </div>
      )}

      {/* Product Found */}
      {product && !loading && (
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-muted-foreground">{product.sku} • {product.category}</p>
            </div>
            {isInCart && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                In Cart
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground">Price</span>
              <p className="text-2xl font-bold">{formatCurrency(product.selling_price)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Available</span>
              <p className="text-2xl font-bold">{product.stock_quantity > 0 ? product.stock_quantity : "Out"}</p>
            </div>
          </div>

          {product.stock_quantity > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <p className="text-xl font-bold">{formatCurrency(product.selling_price * quantity)}</p>
                </div>
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={submitting}
                >
                  <ShoppingCart className="size-4 mr-2" />
                  {submitting ? "Adding..." : "Add to Cart"}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="lg" disabled>
              Out of Stock
            </Button>
          )}
        </div>
      )}

      {/* No Product */}
      {!product && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <QrCode className="size-16 mx-auto mb-4 opacity-20" />
          <p>Scan a product QR or enter UUID</p>
        </div>
      )}

      {/* Cart Summary */}
      {items.length > 0 && (
        <Link href="/cart">
          <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-auto z-40">
            <Button size="lg" className="w-full lg:w-auto shadow-lg">
              <ShoppingCart className="size-5 mr-2" />
              View Cart ({items.length})
            </Button>
          </div>
        </Link>
      )}
    </div>
  )
}

export default function CustomerScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <QrCode className="size-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}