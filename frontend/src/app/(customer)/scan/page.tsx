"use client"

import { redirect } from "next/navigation"
import { useEffect, useRef, useState, Suspense } from "react"
import Link from "next/link"
import { CameraOff, Search, QrCode, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRole } from "@/components/auth/role-guard"
import { clientApi } from "@/lib/client-api"
import { useCustomerCartStore } from "@/store/customer-cart"
import { useCustomerStore } from "@/store/customer-store"
import { toast } from "sonner"
import { BottomNav } from "@/components/layout/bottom-nav"

interface ProductInfo {
  id: number
  product_uuid: string
  name: string
  sku: string
  stock_quantity: number
  category: string
  selling_price: number
  store_id: number | null
  store_name: string | null
}

function ScanContent() {
  const { isLoaded, isSignedIn, role } = useRole()
  const [manualUuid, setManualUuid] = useState("")
  const [loading, setLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const html5QrCodeRef = useRef<any>(null)

  const { items, addItem } = useCustomerCartStore()
  const { selectedStore } = useCustomerStore()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) redirect("/login")
    if (role && role !== "customer") redirect("/dashboard")
  }, [isLoaded, isSignedIn, role])

  const lookUpProduct = async (uuid: string) => {
    setLoading(true)
    try {
      let productData: ProductInfo | null = null
      try { const data = await clientApi.get<ProductInfo>(`/api/v1/catalog/by-uuid/${uuid}`); productData = { ...data, product_uuid: uuid } }
      catch { const data = await clientApi.get<ProductInfo>(`/api/v1/products/by-uuid/${uuid}`); productData = { ...data, product_uuid: uuid } }
      if (!productData) { toast.error("Product not found for this QR code"); return }
      if (!selectedStore) { toast.error("Please select a store first"); return }
      if (productData.store_id !== selectedStore.id) {
        toast.error(`This product belongs to ${productData.store_name || "another store"}`)
        return
      }
      if (productData.stock_quantity <= 0) { toast.error(`${productData.name} is out of stock`); return }
      addItem({ product_id: productData.id, name: productData.name, sku: productData.sku, unit_price: productData.selling_price, product_uuid: productData.product_uuid, storeId: selectedStore.id }, 1)
      toast.success(`${productData.name} added to cart`)
    } catch { toast.error("Product not found for this QR code") }
    finally { setLoading(false) }
  }

  const handleManualSubmit = (e: React.FormEvent) => { e.preventDefault(); const uuid = manualUuid.trim(); if (!uuid) return; lookUpProduct(uuid) }

  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop().catch(() => {})
        await html5QrCodeRef.current.clear().catch(() => {})
      }
      const html5QrCode = new Html5Qrcode("qr-customer-scanner")
      html5QrCodeRef.current = html5QrCode
      setCameraError(null)
      setCameraActive(false)
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => lookUpProduct(decodedText.trim()),
        () => {},
      )
      setCameraActive(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined
      setCameraError(msg || "Camera access denied"); setCameraActive(false)
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); await html5QrCodeRef.current.clear() } catch {}
      html5QrCodeRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    if (role === "customer") { const timer = setTimeout(() => startCamera(), 500); return () => { clearTimeout(timer); stopCamera() } }
    return () => stopCamera()
  }, [role])

  if (!isLoaded || !isSignedIn || role !== "customer") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center"><QrCode className="size-8 animate-spin mx-auto text-primary" /><p className="text-muted-foreground mt-2">Loading...</p></div>
      </div>
    )
  }

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-center relative">
          <div className="flex-1 text-center">
            <h1 className="font-bold text-lg text-foreground">Scan Product</h1>
            {selectedStore && <p className="text-base font-semibold text-primary mt-0.5">{selectedStore.name}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 mx-auto" style={{ maxWidth: "480px" }}>
        {/* Scanner */}
        <div className={`bg-card rounded-2xl border p-3 shadow-sm transition-all duration-300 ${cameraActive ? "border-primary/30 ring-2 ring-primary/10" : "border-border"}`}>
          <div className="relative aspect-video rounded-xl bg-gradient-to-br from-muted to-primary/10 overflow-hidden">
            <div id="qr-customer-scanner" className="w-full h-full" />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 pointer-events-none">
                <div className="text-center p-8">
                  <CameraOff className="size-12 mx-auto mb-3 opacity-60" />
                  <p className="text-sm">{cameraError}</p>
                </div>
              </div>
            )}
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                <div className="text-center p-8">
                  <QrCode className="size-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Point camera at a product QR code</p>
                </div>
              </div>
            )}
            {cameraActive && (
              <div className="absolute top-2 left-2 right-2 flex justify-center pointer-events-none">
                <span className="px-2.5 py-0.5 bg-green-500/80 text-white text-[10px] font-semibold rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1">
                  <span className="size-1.5 bg-white rounded-full animate-pulse" />
                  Live
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Entry */}
        <div className="mt-5">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or enter UUID manually</span>
            </div>
          </div>
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <Input placeholder="Paste product UUID..." value={manualUuid} onChange={(e) => setManualUuid(e.target.value)} className="rounded-xl h-11 text-sm" />
            <Button type="submit" variant="outline" disabled={!manualUuid.trim()} className="rounded-xl h-11 shrink-0"><Search className="size-4" /></Button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="size-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Looking up product...</p>
          </div>
        )}

        {!loading && (
          <div className="text-center py-12 text-muted-foreground mt-4">
            <div className="size-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center border border-border">
              <QrCode className="size-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground/80">Scan a product QR</p>
            <p className="text-sm text-muted-foreground mt-1">or enter the UUID manually</p>
            {cartCount > 0 && <p className="text-xs text-primary font-medium mt-2">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</p>}
          </div>
        )}

        {/* Cart FAB */}
        {cartCount > 0 && (
          <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
            <Link href="/cart">
              <div className="bg-primary text-white rounded-2xl py-3.5 px-5 flex items-center justify-between shadow-lg shadow-blue-200/40 hover:shadow-xl hover:shadow-blue-300/50 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="size-5" />
                  <span className="font-semibold">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-sm font-medium text-primary-foreground/60">View Cart →</span>
              </div>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default function CustomerScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center"><QrCode className="size-8 animate-spin mx-auto text-primary" /><p className="text-muted-foreground mt-2">Loading...</p></div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
