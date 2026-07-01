"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Product, ProductFormData } from "@/types/product"
import { Store } from "@/types/store"
import { clientApi } from "@/lib/client-api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProductFormData) => Promise<void>
  product?: Product | null
}

export function ProductFormDialog({ open, onOpenChange, onSubmit, product }: Props) {
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    sku: "",
    category: "",
    brand: "",
    description: "",
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    reorder_threshold: 10,
    store_id: null,
  })
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      clientApi.get<Store[]>("/api/v1/stores/").then(setStores).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        category: product.category || "",
        brand: product.brand || "",
        description: product.description || "",
        cost_price: product.cost_price || 0,
        selling_price: product.selling_price || 0,
        stock_quantity: product.stock_quantity || 0,
        reorder_threshold: product.reorder_threshold || 10,
        store_id: product.store_id || null,
      })
    } else {
      setForm({
        name: "", sku: "", category: "", brand: "", description: "",
        cost_price: 0, selling_price: 0, stock_quantity: 0, reorder_threshold: 10, store_id: null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { ...form }
      if (!data.sku) {
        data.sku = data.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50) + "-" + Date.now().toString(36)
      }
      await onSubmit(data)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>{product ? "Update product details" : "Add a new product to your inventory"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU (optional)</label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if blank" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category (optional)</label>
              <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value || null })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand</label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost Price</label>
              <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selling Price</label>
              <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Quantity</label>
              <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reorder Threshold</label>
              <Input type="number" value={form.reorder_threshold} onChange={(e) => setForm({ ...form, reorder_threshold: parseInt(e.target.value) })} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Store</label>
              <Select
                value={form.store_id ? String(form.store_id) : ""}
                onValueChange={(val) => setForm({ ...form, store_id: val ? parseInt(val) : null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No store (shared)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No store (shared)</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : product ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
