"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Search, Package, QrCode, Plus, Minus, Equal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

interface ProductInfo {
  id: number
  product_uuid: string
  name: string
  sku: string
  stock_quantity: number
  store_name: string | null
  category: string
}

type ActionType = "add" | "remove" | "adjust"

export default function InventoryScanPage() {
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

  const lookUpProduct = async (uuid: string) => {
    setLoading(true)
    setProduct(null)
    setQuantity(1)
    try {
      const data = await clientApi.get<ProductInfo>(`/api/v1/products/by-uuid/${uuid}`)
      setProduct(data)
      setScannedUuid(uuid)
    } catch {
      toast.error("Product not found for this QR code")
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
        await html5QrCodeRef.current.stop().catch(() => {})
        await html5QrCodeRef.current.clear().catch(() => {})
      }
      const html5QrCode = new Html5Qrcode("qr-inventory-scanner-static")
      html5QrCodeRef.current = html5QrCode
      setCameraError(null)
      setCameraActive(false)
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

  const handleSubmit = async () => {
    if (!product) return
    if (quantity < 0) {
      toast.error("Quantity must be non-negative")
      return
    }
    if (action === "remove" && quantity > product.stock_quantity) {
      toast.error(`Cannot remove ${quantity}: only ${product.stock_quantity} in stock`)
      return
    }
    setSubmitting(true)
    try {
      const result = await clientApi.post<{
        product_id: number
        product_name: string
        sku: string
        previous_stock: number
        new_stock: number
        movement_id: number
        movement_type: string
      }>("/api/v1/inventory/stock-update", {
        product_id: product.id,
        action,
        quantity,
      })
      toast.success(
        `${product.name}: ${result.previous_stock} → ${result.new_stock} (${action})`,
      )
      product.stock_quantity = result.new_stock
      setProduct({ ...product })
    } catch (err: any) {
      toast.error(err?.message || "Stock update failed")
    } finally {
      setSubmitting(false)
    }
  }

  const actionConfig: Record<ActionType, { icon: any; label: string; variant: "default" | "secondary" | "destructive"; class: string }> = {
    add: { icon: Plus, label: "Add Stock", variant: "default", class: "" },
    remove: { icon: Minus, label: "Remove Stock", variant: "destructive", class: "" },
    adjust: { icon: Equal, label: "Set Stock", variant: "secondary", class: "" },
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Inventory Scan</h1>
        <Badge variant="outline" className="text-xs gap-1">
          <QrCode className="size-3" />
          QR Mode
        </Badge>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Camera className="size-4" />
            Scan QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video rounded-xl border bg-slate-50 overflow-hidden">
            <div id="qr-inventory-scanner-static" className="w-full h-full" />
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none">
                <div className="text-center p-8">
                  <QrCode className="size-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Point camera at a product QR code</p>
                </div>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 pointer-events-none">
                <div className="text-center p-8">
                  <CameraOff className="size-12 mx-auto mb-3 opacity-60" />
                  <p className="text-sm">{cameraError}</p>
                </div>
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
        <>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Package className="size-4" />
                {product.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <span className="text-sm font-medium text-slate-700 mb-1.5 block">Current Stock</span>
                  <p className="text-lg font-bold text-slate-900">{product.stock_quantity}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700 mb-1.5 block">Store</span>
                  <p className="font-medium text-slate-900">{product.store_name || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Stock Update</CardTitle>
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
                        : "New stock quantity"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="rounded-xl border-slate-200 h-11"
                  />
                </div>
                <div className="pt-5">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || action === "remove" && quantity > product.stock_quantity}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200"
                  >
                    {submitting ? "Updating..." : "Update Stock"}
                  </Button>
                </div>
              </div>

              {action === "remove" && quantity > product.stock_quantity && (
                <p className="text-xs text-red-500">
                  Cannot remove more than current stock ({product.stock_quantity})
                </p>
              )}
              {action === "adjust" && (
                <p className="text-xs text-slate-500">
                  Stock will be set to exactly {quantity} (was {product.stock_quantity})
                </p>
              )}
              {action === "add" && (
                <p className="text-xs text-slate-500">
                  Stock will become {product.stock_quantity + quantity}
                </p>
              )}
            </CardContent>
          </Card>
        </>
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
  )
}
