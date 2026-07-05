"use client"

import { useEffect, useRef, useState } from "react"
import { Download, AlertTriangle, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Product } from "@/types/product"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
}

export function ProductQrDialog({ open, onOpenChange, product }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const qrBlobRef = useRef<Blob | null>(null)

  const loadQr = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const resp = await fetch(`${API_URL}/api/v1/qrcodes/permanent/${product.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!resp.ok) throw new Error("Failed to load QR")
      const blob = await resp.blob()
      qrBlobRef.current = blob
      setQrDataUrl(URL.createObjectURL(blob))
    } catch {
      setQrDataUrl(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadQr()
    }
    return () => {
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl)
    }
  }, [open, product.id])

  const handleDownload = () => {
    if (!qrBlobRef.current) return
    const url = URL.createObjectURL(qrBlobRef.current)
    const link = document.createElement("a")
    link.href = url
    link.download = `product_${product.id}_qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleRegenerate = async () => {
    if (!confirm("Regenerate QR identity? This will create a new UUID. Existing QR codes will stop working.")) return
    setRegenerating(true)
    try {
      const token = await getToken()
      const resp = await fetch(`${API_URL}/api/v1/qrcodes/permanent/${product.id}/regenerate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!resp.ok) throw new Error("Failed to regenerate")
      const blob = await resp.blob()
      qrBlobRef.current = blob
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl)
      setQrDataUrl(URL.createObjectURL(blob))
      toast.success("QR identity regenerated")
    } catch {
      toast.error("Failed to regenerate QR identity")
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            QR Identity — {product.name}
          </DialogTitle>
          <DialogDescription>
            This permanent QR code is tied to the product UUID. It will continue working even if product details change.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-lg border p-2 bg-white">
            {loading ? (
              <div className="size-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code for ${product.name}`} className="size-48" />
            ) : (
              <div className="size-48 flex items-center justify-center text-destructive text-sm">Failed to load</div>
            )}
          </div>

          <div className="w-full space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Product UUID</label>
            <div className="flex items-center gap-2">
              <Input value={product.product_uuid} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(product.product_uuid)
                  toast.success("UUID copied")
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2 rounded-lg border bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            The QR encodes only the product UUID — no name, price, or stock. It stays valid even when product information changes.
          </span>
        </div>

        <DialogFooter showCloseButton>
          <Button variant="outline" onClick={handleDownload} disabled={!qrBlobRef.current}>
            <Download className="size-4 mr-1.5" />
            Download PNG
          </Button>
          <Button variant="destructive" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? "Regenerating..." : "Regenerate UUID"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function getToken(): Promise<string | null> {
  try {
    const { getSession } = await import("next-auth/react")
    const session = await getSession()
    return (session as { access_token?: string } | null)?.access_token || null
  } catch {
    return null
  }
}
