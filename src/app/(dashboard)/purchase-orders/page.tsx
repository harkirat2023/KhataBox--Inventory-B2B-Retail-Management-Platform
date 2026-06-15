"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  draft: "bg-gray-100 text-gray-800 border-gray-300",
  sent: "bg-blue-100 text-blue-800 border-blue-300",
  received: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
}

const statusOptions: POStatus[] = ["draft", "sent", "received", "cancelled"]

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const data = await clientApi.get<PurchaseOrder[]>("/api/v1/purchase-orders/")
      setOrders(data)
    } catch (err) {
      console.error("Failed to load purchase orders", err)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <Button onClick={() => setDialogOpen(true)}>
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
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No purchase orders found. Create your first PO.
                </TableCell>
              </TableRow>
            )}
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

      <CreatePODialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadOrders}
      />
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={supplierId} onValueChange={(val) => val && setSupplierId(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Items</label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="size-3 mr-1" /> Add Item
                </Button>
              </div>
              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No items added yet.</p>
              )}
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Product</label>
                    <Select
                      value={String(item.product_id)}
                      onValueChange={(val) => val && updateLineItem(idx, "product_id", parseInt(val))}
                    >
                      <SelectTrigger>
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
                  <div className="w-20 space-y-1">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="text-xs text-muted-foreground">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-9 mb-0.5 text-destructive" onClick={() => removeLineItem(idx)}>
                    &times;
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create PO"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
