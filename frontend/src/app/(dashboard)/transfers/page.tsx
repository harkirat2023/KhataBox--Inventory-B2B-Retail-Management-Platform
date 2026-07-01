"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import { Store, StockTransfer, StockTransferFormData } from "@/types/store"
import { Product } from "@/types/product"

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-amber-100 text-amber-800 border-amber-300" },
  approved: { label: "Approved", class: "bg-blue-100 text-blue-800 border-blue-300" },
  rejected: { label: "Rejected", class: "bg-red-100 text-red-800 border-red-300" },
  completed: { label: "Completed", class: "bg-green-100 text-green-800 border-green-300" },
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<StockTransferFormData>({
    product_id: 0, from_store_id: 0, to_store_id: 0, quantity: 0, notes: "",
  })

  const loadTransfers = useCallback(async () => {
    try {
      const params = statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : ""
      setTransfers(await clientApi.get<StockTransfer[]>(`/api/v1/transfers/${params}`))
    } catch { console.error("Failed to load transfers") }
  }, [statusFilter])

  const loadStoresAndProducts = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        clientApi.get<Store[]>("/api/v1/stores/"),
        clientApi.get<Product[]>("/api/v1/products/"),
      ])
      setStores(s)
      setProducts(p)
    } catch {}
  }, [])

  useEffect(() => { loadTransfers() }, [loadTransfers])
  useEffect(() => { loadStoresAndProducts() }, [loadStoresAndProducts])

  const filtered = transfers.filter((t) =>
    t.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.from_store_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.to_store_name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!form.product_id || !form.from_store_id || !form.to_store_id || form.quantity <= 0) {
      toast.error("Please fill all required fields")
      return
    }
    if (form.from_store_id === form.to_store_id) {
      toast.error("Source and destination stores must be different")
      return
    }
    setCreating(true)
    try {
      await clientApi.post("/api/v1/transfers/", form)
      toast.success("Transfer created")
      setDialogOpen(false)
      setForm({ product_id: 0, from_store_id: 0, to_store_id: 0, quantity: 0, notes: "" })
      await loadTransfers()
    } catch { toast.error("Failed to create transfer") }
    finally { setCreating(false) }
  }

  const handleApprove = async (id: number, newStatus: string) => {
    try {
      await clientApi.patch(`/api/v1/transfers/${id}/status`, { status: newStatus })
      toast.success(`Transfer ${newStatus}`)
      await loadTransfers()
    } catch { toast.error("Failed to update transfer") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground mt-1">Transfer stock between stores</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="size-4 mr-2" /> New Transfer</Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search product or store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  No transfers found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.product_name || `Product #${t.product_id}`}</TableCell>
                <TableCell className="font-mono text-sm">{t.product_sku || "—"}</TableCell>
                <TableCell className="text-sm">{t.from_store_name || `Store #${t.from_store_id}`}</TableCell>
                <TableCell className="text-sm">{t.to_store_name || `Store #${t.to_store_id}`}</TableCell>
                <TableCell className="font-medium">{t.quantity}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs px-2 py-0 ${(statusConfig[t.status]?.class) || ""}`}>
                    {statusConfig[t.status]?.label || t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {t.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprove(t.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleApprove(t.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
                  {t.status === "approved" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprove(t.id, "completed")}>
                      Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>Move stock from one store to another</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product *</label>
              <Select value={String(form.product_id)} onValueChange={(v) => v && setForm({ ...form, product_id: parseInt(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Store *</label>
                <Select value={String(form.from_store_id)} onValueChange={(v) => v && setForm({ ...form, from_store_id: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Store *</label>
                <Select value={String(form.to_store_id)} onValueChange={(v) => v && setForm({ ...form, to_store_id: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input type="number" min={1} value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create Transfer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
