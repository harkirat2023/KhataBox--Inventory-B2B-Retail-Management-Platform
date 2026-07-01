"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Search, Package, QrCode, Plus, Minus, Equal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
        <h1 className="text-2xl font-semibold">Inventory Scan</h1>
        <Badge variant="outline" className="text-xs gap-1">
          <QrCode className="size-3" />
          QR Mode
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="size-4" />
            Scan QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video rounded-lg border bg-muted overflow-hidden">
            <div id="qr-inventory-scanner-static" className="w-full h-full" />
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                <div className="text-center p-8">
                  <QrCode className="size-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Point camera at a product QR code</p>
                </div>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-destructive pointer-events-none">
                <div className="text-center p-8">
                  <CameraOff className="size-12 mx-auto mb-3 opacity-60" />
                  <p className="text-sm">{cameraError}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!cameraActive ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="size-4 mr-1.5" />
                Start Camera
              </Button>
            ) : (
              <Button variant="outline" onClick={stopCamera} className="flex-1">
                <CameraOff className="size-4 mr-1.5" />
                Stop Camera
              </Button>
            )}
          </div>

          <div className="relative">
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
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Looking up product...
          </CardContent>
        </Card>
      )}

      {product && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4" />
                {product.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">SKU</span>
                  <p className="font-mono font-medium">{product.sku}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-medium">{product.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Stock</span>
                  <p className="text-lg font-bold">{product.stock_quantity}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Store</span>
                  <p className="font-medium">{product.store_name || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {(["add", "remove", "adjust"] as ActionType[]).map((a) => {
                  const cfg = actionConfig[a]
                  const Icon = cfg.icon
                  return (
                    <Button
                      key={a}
                      variant={action === a ? cfg.variant : "outline"}
                      onClick={() => setAction(a)}
                      className="flex-1"
                    >
                      <Icon className="size-4 mr-1" />
                      {cfg.label}
                    </Button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
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
                  />
                </div>
                <div className="pt-5">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || action === "remove" && quantity > product.stock_quantity}
                  >
                    {submitting ? "Updating..." : "Update Stock"}
                  </Button>
                </div>
              </div>

              {action === "remove" && quantity > product.stock_quantity && (
                <p className="text-xs text-destructive">
                  Cannot remove more than current stock ({product.stock_quantity})
                </p>
              )}
              {action === "adjust" && (
                <p className="text-xs text-muted-foreground">
                  Stock will be set to exactly {quantity} (was {product.stock_quantity})
                </p>
              )}
              {action === "add" && (
                <p className="text-xs text-muted-foreground">
                  Stock will become {product.stock_quantity + quantity}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!product && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <QrCode className="size-16 mx-auto mb-4 opacity-20" />
            <p>Scan a product QR code or enter a UUID to begin</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
