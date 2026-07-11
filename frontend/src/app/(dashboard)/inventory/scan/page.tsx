"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, CameraOff, Search, Package, QrCode, Barcode, Plus, Minus, Equal, Loader2, X, ShoppingCart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

interface BarcodeProduct {
  barcode: string
  product_name: string
  price: number
  quantity: number
}

type ActionType = "add" | "remove" | "adjust"
type ScanMode = "qr" | "barcode"

export default function InventoryScanPage() {
  const [scanMode, setScanMode] = useState<ScanMode>("qr")
  const [scannedUuid, setScannedUuid] = useState("")
  const [manualUuid, setManualUuid] = useState("")
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [action, setAction] = useState<ActionType>("add")
  const [submitting, setSubmitting] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scannerPaused, setScannerPaused] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalProduct, setModalProduct] = useState<BarcodeProduct>({ barcode: "", product_name: "", price: 0, quantity: 1 })
  const [inventory, setInventory] = useState<BarcodeProduct[]>([])

  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch {}
      html5QrCodeRef.current = null
    }
    setCameraActive(false)
    setScannerPaused(false)
  }, [])

  const startScanner = useCallback(async (mode: ScanMode) => {
    try {
      await stopScanner()
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setCameraError(null)
      setCameraActive(false)
      setScannerPaused(false)

      const formats = mode === "barcode"
        ? [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF,
          ]
        : [Html5QrcodeSupportedFormats.QR_CODE]

      const html5QrCode = new Html5Qrcode("qr-inventory-scanner-static", {
        formatsToSupport: formats,
        verbose: false,
        useBarCodeDetectorIfSupported: mode === "barcode",
      })
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          if (scannerPaused) return
          setScannerPaused(true)
          try {
            await html5QrCode.pause()
          } catch {}
          handleScan(decodedText, mode)
        },
        () => {},
      )
      setCameraActive(true)
    } catch (err: any) {
      setCameraError(err?.message || "Camera access denied")
      setCameraActive(false)
    }
  }, [scannerPaused])

  const resumeScanner = useCallback(async () => {
    if (html5QrCodeRef.current && scannerPaused) {
      try {
        await html5QrCodeRef.current.resume()
        setScannerPaused(false)
      } catch {}
    }
  }, [scannerPaused])

  const handleScan = async (code: string, mode: ScanMode) => {
    if (mode === "qr") {
      lookUpProduct(code.trim())
    } else {
      await fetchOpenFoodFacts(code.trim())
    }
  }

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
      await resumeScanner()
    } finally {
      setLoading(false)
    }
  }

  const fetchOpenFoodFacts = async (barcode: string) => {
    setBarcodeLoading(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
      const data = await res.json()
      let productName = `Product (${barcode})`
      let productPrice = 0
      if (data?.status === 1 && data.product) {
        productName = data.product.product_name || data.product.generic_name || productName
        const priceTags = data.product.product_name || ""
        const price = data.product.price || data.product.kilocalories || 0
        productPrice = typeof price === "number" && price > 0 ? price : 0
      }
      setModalProduct({ barcode, product_name: productName, price: productPrice, quantity: 1 })
      setShowModal(true)
    } catch {
      setModalProduct({ barcode, product_name: `Product (${barcode})`, price: 0, quantity: 1 })
      setShowModal(true)
    } finally {
      setBarcodeLoading(false)
    }
  }

  const handleModalAdd = () => {
    if (!modalProduct.product_name.trim()) {
      toast.error("Product name is required")
      return
    }
    if (modalProduct.quantity < 1) {
      toast.error("Quantity must be at least 1")
      return
    }
    setInventory(prev => [...prev, { ...modalProduct }])
    setShowModal(false)
    toast.success(`${modalProduct.product_name} added to inventory`)
    resumeScanner()
  }

  const handleModalCancel = () => {
    setShowModal(false)
    resumeScanner()
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const uuid = manualUuid.trim()
    if (!uuid) return
    lookUpProduct(uuid)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

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
      toast.success(`${product.name}: ${result.previous_stock} → ${result.new_stock} (${action})`)
      product.stock_quantity = result.new_stock
      setProduct({ ...product })
    } catch (err: any) {
      toast.error(err?.message || "Stock update failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClearInventory = () => {
    setInventory([])
    toast.success("Local inventory cleared")
  }

  const actionConfig: Record<ActionType, { icon: any; label: string }> = {
    add: { icon: Plus, label: "Add Stock" },
    remove: { icon: Minus, label: "Remove Stock" },
    adjust: { icon: Equal, label: "Set Stock" },
  }

  const subtotal = inventory.reduce((s, i) => s + i.price * i.quantity, 0)

  const totalQuantity = inventory.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Scan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scan QR codes or barcodes to manage stock</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl self-start">
          <button
            onClick={() => { stopScanner(); setScanMode("qr"); setProduct(null); setCameraError(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              scanMode === "qr" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="size-4 inline mr-1.5" />
            QR Lookup
          </button>
          <button
            onClick={() => { stopScanner(); setScanMode("barcode"); setProduct(null); setCameraError(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              scanMode === "barcode" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Barcode className="size-4 inline mr-1.5" />
            Barcode Scanner
          </button>
        </div>
      </div>

      {/* Scanner Card */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            {scanMode === "qr" ? <Camera className="size-4" /> : <Barcode className="size-4" />}
            {scanMode === "qr" ? "Scan QR Code" : "Scan Barcode"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video rounded-xl border bg-muted overflow-hidden">
            <div id="qr-inventory-scanner-static" className="w-full h-full" />
            {!cameraActive && !cameraError && !scannerPaused && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                <div className="text-center p-8">
                  {scanMode === "qr" ? (
                    <><QrCode className="size-12 mx-auto mb-3 opacity-40" /><p className="text-sm">Point camera at a product QR code</p></>
                  ) : (
                    <><Barcode className="size-12 mx-auto mb-3 opacity-40" /><p className="text-sm">Point camera at a product barcode</p></>
                  )}
                </div>
              </div>
            )}
            {scannerPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-none">
                <div className="text-center p-8">
                  <Loader2 className="size-10 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processing scan...</p>
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
              <Button className="rounded-xl h-11 px-5 flex-1" onClick={() => startScanner(scanMode)}>
                <Camera className="size-4 mr-1.5" />
                Start Camera
              </Button>
            ) : (
              <Button variant="outline" className="rounded-xl h-11 px-5 flex-1" onClick={stopScanner}>
                <CameraOff className="size-4 mr-1.5" />
                Stop Camera
              </Button>
            )}
          </div>

          {scanMode === "qr" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or enter UUID manually</span></div>
              </div>
              <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                <Input
                  placeholder="Paste product UUID..."
                  value={manualUuid}
                  onChange={(e) => setManualUuid(e.target.value)}
                  className="rounded-xl border-border h-11"
                />
                <Button type="submit" variant="outline" className="rounded-xl size-11" disabled={!manualUuid.trim()}>
                  <Search className="size-4" />
                </Button>
              </form>
            </>
          )}

          {scanMode === "barcode" && (
            <p className="text-xs text-muted-foreground text-center">
              Supports EAN-13, UPC-A, CODE-128, and more. Scanned products are looked up via Open Food Facts.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Barcode loading */}
      {barcodeLoading && (
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="py-6 text-center">
            <Loader2 className="size-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Looking up product on Open Food Facts...</p>
          </CardContent>
        </Card>
      )}

      {/* QR Product found */}
      {loading && (
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="py-8 space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Looking up product...</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-5 w-32" /></div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {product && !loading && (
        <>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Package className="size-4" />
                {product.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-sm font-medium text-foreground/80 mb-1.5 block">SKU</span>
                  <p className="font-mono font-medium text-foreground">{product.sku}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground/80 mb-1.5 block">Category</span>
                  <p className="font-medium text-foreground">{product.category}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground/80 mb-1.5 block">Current Stock</span>
                  <p className="text-lg font-bold text-foreground">{product.stock_quantity}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground/80 mb-1.5 block">Store</span>
                  <p className="font-medium text-foreground">{product.store_name || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Stock Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {(["add", "remove", "adjust"] as ActionType[]).map((a) => {
                  const cfg = actionConfig[a]
                  const Icon = cfg.icon
                  const isActive = action === a
                  return (
                    <Button
                      key={a}
                      onClick={() => setAction(a)}
                      variant={isActive ? (a === "remove" ? "destructive" : "default") : "outline"}
                      className="rounded-xl h-11 px-5"
                    >
                      <Icon className="size-4 mr-1" />
                      {cfg.label}
                    </Button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground/80 mb-1.5 block">
                    {action === "add" ? "Quantity to add" : action === "remove" ? "Quantity to remove" : "New stock quantity"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="rounded-xl border-border h-11"
                  />
                </div>
                <div className="pt-5">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || (action === "remove" && quantity > product.stock_quantity)}
                    className="rounded-xl h-11 px-5"
                  >
                    {submitting ? "Updating..." : "Update Stock"}
                  </Button>
                </div>
              </div>

              {action === "remove" && quantity > product.stock_quantity && (
                <p className="text-xs text-red-500">Cannot remove more than current stock ({product.stock_quantity})</p>
              )}
              {action === "adjust" && (
                <p className="text-xs text-muted-foreground">Stock will be set to exactly {quantity} (was {product.stock_quantity})</p>
              )}
              {action === "add" && (
                <p className="text-xs text-muted-foreground">Stock will become {product.stock_quantity + quantity}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!product && !loading && !barcodeLoading && scanMode === "qr" && (
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="py-16 text-center">
            <QrCode className="size-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Scan a Product</h3>
            <p className="text-sm text-muted-foreground">Point camera at a product QR code or enter a UUID to begin</p>
          </CardContent>
        </Card>
      )}

      {/* Barcode-Scanned Inventory Table */}
      {scanMode === "barcode" && (
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ShoppingCart className="size-4" />
                Scanned Products
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{inventory.length} item{inventory.length !== 1 ? "s" : ""} · {totalQuantity} units</p>
            </div>
            {inventory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearInventory} className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl">
                <Trash2 className="size-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-center py-12">
                <Barcode className="size-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No products scanned yet</p>
                <p className="text-xs text-muted-foreground mt-1">Scan barcodes to add products to your local inventory list</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">#</TableHead>
                      <TableHead className="font-semibold text-xs">Barcode</TableHead>
                      <TableHead className="font-semibold text-xs">Product Name</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Price (₹)</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Qty</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{item.product_name}</TableCell>
                        <TableCell className="text-right tabular-nums">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell colSpan={3} className="text-sm">Total</TableCell>
                      <TableCell className="text-right tabular-nums">₹{inventory.reduce((s, i) => s + i.price, 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{totalQuantity}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">₹{subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barcode Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleModalCancel() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-4" />
              Add to Inventory
            </DialogTitle>
            <DialogDescription>
              Product scanned: <span className="font-mono text-xs">{modalProduct.barcode}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Product Name</label>
              <Input
                value={modalProduct.product_name}
                onChange={(e) => setModalProduct(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="Enter product name"
                className="rounded-xl border-border h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Price (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modalProduct.price}
                  onChange={(e) => setModalProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="rounded-xl border-border h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Stock Quantity</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={modalProduct.quantity}
                  onChange={(e) => setModalProduct(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="rounded-xl border-border h-11"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleModalCancel} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleModalAdd} className="rounded-xl gap-1">
              <Plus className="size-4" />
              Add to Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
