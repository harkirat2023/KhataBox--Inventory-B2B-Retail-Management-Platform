"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import { Product } from "@/types/product"
import { Supplier } from "@/types/supplier"

type POStatus = "draft" | "sent" | "received" | "cancelled"

interface POItem {
  product_id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  total: number
}

interface PurchaseOrder {
  id: number
  po_number: string
  supplier_id: number
  supplier_name: string
  items: POItem[]
  total: number
  status: POStatus
  notes: string
  created_at: string
  updated_at: string
}

const statusConfig: Record<POStatus, { label: string }> = {
  draft: { label: "Draft" },
  sent: { label: "Sent" },
  received: { label: "Received" },
  cancelled: { label: "Cancelled" },
}

const statusStyles: Record<POStatus, string> = {
  draft: "bg-muted text-foreground/80 border-border",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  received: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
}

const statusOptions: POStatus[] = ["draft", "sent", "received", "cancelled"]

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    try {
      const data = await clientApi.get<PurchaseOrder[]>("/api/v1/purchase-orders/")
      setOrders(data)
    } catch (err) {
      console.error("Failed to load purchase orders", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleStatusChange = async (orderId: number, status: POStatus) => {
    try {
      await clientApi.patch(`/api/v1/purchase-orders/${orderId}/status`, { status })
      await loadOrders()
      toast.success(`PO status updated to ${status}`)
    } catch (err) {
      console.error("Failed to update status", err)
      toast.error("Failed to update status")
    }
  }

  const filtered = orders.filter(
    (o) =>
      o.po_number.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> Create PO
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by PO number or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-muted border-0 h-11"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-border shadow-sm">
            <FileText className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No purchase orders found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first purchase order to get started.</p>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4 mr-2" /> Create PO
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm font-medium">{order.po_number}</TableCell>
                <TableCell>{order.supplier_name}</TableCell>
                <TableCell>{order.items?.length || 0}</TableCell>
                <TableCell className="font-medium">₹{order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(val) => val && handleStatusChange(order.id, val as POStatus)}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue>
                        <Badge variant="outline" className={`text-xs px-2 py-0 ${statusStyles[order.status]}`}>
                          {statusConfig[order.status].label}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          <Badge variant="outline" className={`text-xs px-2 py-0 ${statusStyles[s]}`}>
                            {statusConfig[s].label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <CreatePODialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadOrders}
      />
      </div>
    </div>
  )
}

function CreatePODialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => Promise<void>
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<{ product_id: number; quantity: number; unit_price: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        const [s, p] = await Promise.all([
          clientApi.get<Supplier[]>("/api/v1/suppliers/"),
          clientApi.get<Product[]>("/api/v1/products/"),
        ])
        setSuppliers(s)
        setProducts(p)
      } catch (err) {
        console.error("Failed to load form data", err)
      }
    }
    load()
    setSupplierId("")
    setNotes("")
    setLineItems([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: 0, quantity: 1, unit_price: 0 }])
  }

  const updateLineItem = (index: number, field: string, value: number) => {
    const updated = [...lineItems]
    if (field === "product_id") {
      updated[index].product_id = value
      const product = products.find((p) => p.id === value)
      if (product) updated[index].unit_price = product.cost_price
    } else if (field === "quantity") {
      updated[index].quantity = value
    } else if (field === "unit_price") {
      updated[index].unit_price = value
    }
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || lineItems.length === 0 || lineItems.some((li) => !li.product_id)) {
      toast.error("Please select a supplier and add at least one product")
      return
    }
    setLoading(true)
    try {
      await clientApi.post("/api/v1/purchase-orders/", {
        supplier_id: parseInt(supplierId),
        items: lineItems.map((li) => ({
          product_id: li.product_id,
          quantity: li.quantity,
          unit_price: li.unit_price,
        })),
        notes,
      })
      toast.success("Purchase order created")
      onOpenChange(false)
      await onSuccess()
    } catch (err) {
      toast.error("Failed to create purchase order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Create a new purchase order for a supplier</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Supplier</label>
              <Select value={supplierId} onValueChange={(val) => val && setSupplierId(val)}>
                <SelectTrigger className="rounded-xl border-border h-11">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground/80 block">Items</label>
                <Button type="button" className="bg-card border border-border text-foreground/80 hover:bg-muted hover:border-border rounded-xl h-9 px-4 text-sm transition-all duration-200" onClick={addLineItem}>
                  <Plus className="size-3 mr-1" /> Add Item
                </Button>
              </div>
              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No items added yet.</p>
              )}
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Product</label>
                    <Select
                      value={String(item.product_id)}
                      onValueChange={(val) => val && updateLineItem(idx, "product_id", parseInt(val))}
                    >
                      <SelectTrigger className="rounded-xl border-border h-11">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="rounded-xl border-border h-11"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-muted-foreground mb-1 block">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                      className="rounded-xl border-border h-11"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-9 mb-0.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl" onClick={() => removeLineItem(idx)}>
                    &times;
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Notes</label>
              <textarea
                className="w-full min-h-[60px] rounded-xl border-border p-3 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="bg-card border border-border text-foreground/80 hover:bg-muted hover:border-border rounded-xl h-11 px-5 transition-all duration-200" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 transition-all duration-200" disabled={loading}>{loading ? "Creating..." : "Create PO"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
