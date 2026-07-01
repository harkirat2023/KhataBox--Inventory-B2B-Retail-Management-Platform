"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Package, QrCode, Plus, Pencil, Trash2 } from "lucide-react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Product, ProductFormData } from "@/types/product"
import { clientApi } from "@/lib/client-api"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductChanged?: () => void
}

type ScanAction = "none" | "scanned" | "not_found"

export function InventoryQrScanDialog({ open, onOpenChange, onProductChanged }: Props) {
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualUuid, setManualUuid] = useState("")
  const [scanState, setScanState] = useState<ScanAction>("none")
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2, 9)}`)

  const handleScan = async (uuid: string) => {
    setLoading(true)
    try {
      const data = await clientApi.get<Product>(`/api/v1/products/by-uuid/${uuid}`)
      setProduct(data)
      setScanState("scanned")
    } catch {
      setProduct(null)
      setScanState("not_found")
      toast.error("No product found for this QR code")
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      const el = document.getElementById(containerId.current)
      if (!el) { setCameraError("Scanner element not found"); return }

      const scanner = new Html5Qrcode(containerId.current, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          setCameraActive(false)
          handleScan(decodedText.trim())
        },
        () => {},
      )
      setCameraActive(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Camera error"
      setCameraError(msg)
      setCameraActive(false)
    }
  }

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); await scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    if (!open) {
      stopCamera()
      setScanState("none")
      setProduct(null)
      setCameraError(null)
      setManualUuid("")
      setShowEditForm(false)
    }
    return () => { stopCamera() }
  }, [open])

  useEffect(() => {
    if (open && cameraActive) startCamera()
    if (open && !cameraActive) stopCamera()
  }, [open])

  const handleDelete = async () => {
    if (!product) return
    if (!confirm(`Delete product "${product.name}"?`)) return
    try {
      await clientApi.delete(`/api/v1/products/${product.id}`)
      toast.success("Product deleted")
      onProductChanged?.()
      onOpenChange(false)
    } catch {
      toast.error("Failed to delete product")
    }
  }

  const handleEditSubmit = async (data: ProductFormData) => {
    if (!product) return
    await clientApi.put(`/api/v1/products/${product.id}`, data)
    toast.success("Product updated")
    setShowEditForm(false)
    onProductChanged?.()
    await handleScan(product.product_uuid)
  }

  const handleAddStock = async () => {
    if (!product) return
    const qty = prompt("Enter quantity to add:", "1")
    if (!qty) return
    const num = parseInt(qty, 10)
    if (isNaN(num) || num <= 0) { toast.error("Invalid quantity"); return }
    try {
      await clientApi.post("/api/v1/inventory/stock-update", {
        product_id: product.id,
        action: "add",
        quantity: num,
      })
      toast.success(`Added ${num} to ${product.name}`)
      onProductChanged?.()
      await handleScan(product.product_uuid)
    } catch { toast.error("Stock update failed") }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const uuid = manualUuid.trim()
    if (!uuid) return
    handleScan(uuid)
  }

  return (
    <>
      <Dialog open={open && !showEditForm} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5" />
              Scan Product QR
            </DialogTitle>
            <DialogDescription>
              Point camera at a product QR code or enter UUID manually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative w-full bg-muted rounded-lg overflow-hidden" style={{ minHeight: "250px" }}>
              <div id={containerId.current} className="w-full" style={{ minHeight: "250px" }} />
              {!cameraActive && !cameraError && scanState === "none" && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
                  Camera idle
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm p-4 text-center pointer-events-none">
                  {cameraError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!cameraActive ? (
                <Button onClick={startCamera} className="flex-1" size="sm">
                  <Camera className="size-4 mr-1" /> Start Camera
                </Button>
              ) : (
                <Button variant="outline" onClick={stopCamera} className="flex-1" size="sm">
                  <CameraOff className="size-4 mr-1" /> Stop Camera
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or enter UUID</span></div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Paste product UUID..."
                value={manualUuid}
                onChange={(e) => setManualUuid(e.target.value)}
                className="font-mono text-xs"
              />
              <Button type="submit" variant="outline" size="sm" disabled={!manualUuid.trim() || loading}>
                Lookup
              </Button>
            </form>

            {loading && <p className="text-sm text-center text-muted-foreground">Looking up product...</p>}

            {scanState === "scanned" && product && (
              <Card className="border-primary">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku} &bull; ₹{product.selling_price.toFixed(2)}</p>
                    </div>
                    <Badge>{product.stock_quantity} in stock</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="default" onClick={handleAddStock}>
                      <Plus className="size-3 mr-1" /> Add Stock
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowEditForm(true)}>
                      <Pencil className="size-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDelete}>
                      <Trash2 className="size-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {scanState === "not_found" && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Package className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No product found for this QR code</p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showEditForm && product && (
        <ProductFormDialog
          open={showEditForm}
          onOpenChange={setShowEditForm}
          onSubmit={handleEditSubmit}
          product={product}
        />
      )}
    </>
  )
}
