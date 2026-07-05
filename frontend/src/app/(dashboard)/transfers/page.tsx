"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  pending: { label: "Pending", class: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", class: "bg-blue-50 text-blue-700 border-blue-200" },
  rejected: { label: "Rejected", class: "bg-red-50 text-red-700 border-red-200" },
  completed: { label: "Completed", class: "bg-green-50 text-green-700 border-green-200" },
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<StockTransferFormData>({
    product_id: 0, from_store_id: 0, to_store_id: 0, quantity: 0, notes: "",
  })

  const loadTransfers = useCallback(async () => {
    try {
      const params = statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : ""
      setTransfers(await clientApi.get<StockTransfer[]>(`/api/v1/transfers/${params}`))
    } catch { console.error("Failed to load transfers") }
    finally { setLoading(false) }
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
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock Transfers</h1>
            <p className="text-sm text-slate-500 mt-1">Transfer stock between stores</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setDialogOpen(true)}><Plus className="size-4 mr-2" /> New Transfer</Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search product or store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-slate-50 border-0 h-11"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-[150px] rounded-xl border-slate-200 h-11">
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

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ArrowLeftRight className="size-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No transfers found</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">Create your first stock transfer to get started.</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4 mr-2" /> New Transfer
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                <TableCell className="text-sm text-slate-500">
                  {new Date(t.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {t.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-lg h-8 px-3 text-xs transition-all duration-200" onClick={() => handleApprove(t.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" className="bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg h-8 px-3 text-xs transition-all duration-200" onClick={() => handleApprove(t.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
                  {t.status === "approved" && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-3 text-xs transition-all duration-200" onClick={() => handleApprove(t.id, "completed")}>
                      Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>Move stock from one store to another</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Product *</label>
              <Select value={String(form.product_id)} onValueChange={(v) => v && setForm({ ...form, product_id: parseInt(v) })}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11">
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
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">From Store *</label>
                <Select value={String(form.from_store_id)} onValueChange={(v) => v && setForm({ ...form, from_store_id: parseInt(v) })}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">To Store *</label>
                <Select value={String(form.to_store_id)} onValueChange={(v) => v && setForm({ ...form, to_store_id: parseInt(v) })}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
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
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Quantity *</label>
              <Input type="number" min={1} value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="rounded-xl border-slate-200 h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes</label>
              <textarea
                className="w-full min-h-[60px] rounded-xl border-slate-200 p-3 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create Transfer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
