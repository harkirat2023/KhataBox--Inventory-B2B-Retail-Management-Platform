"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, Pencil, Trash2, Ban, ArrowUpCircle, Loader2, Users } from "lucide-react"
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
import { Customer, CustomerFormData } from "@/types/customer"
import { Skeleton } from "@/components/ui/skeleton"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

const priceTiers = ["standard", "premium", "wholesale", "distributor"]

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [extendCreditId, setExtendCreditId] = useState<number | null>(null)
  const [extendAmount, setExtendAmount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi.get<Customer[]>("/api/v1/customers/")
      setCustomers(data)
    } catch (err) {
      console.error("Failed to load customers", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const filtered = customers.filter(
    (c) =>
      (c.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (data: CustomerFormData) => {
    if (!data.contact_person?.trim()) {
      toast.error("Contact person is required")
      return
    }
    if (!data.credit_limit || data.credit_limit <= 0) {
      toast.error("Credit limit must be greater than 0")
      return
    }
    await clientApi.post<Customer>("/api/v1/customers/", data)
    await loadCustomers()
  }

  const handleUpdate = async (data: CustomerFormData) => {
    if (!editingCustomer) return
    await clientApi.put<Customer>(`/api/v1/customers/${editingCustomer.id}`, data)
    setEditingCustomer(null)
    await loadCustomers()
  }

  const handleDelete = async (id: number) => {
    await clientApi.delete(`/api/v1/customers/${id}`)
    setDeleteConfirmId(null)
    await loadCustomers()
  }

  const handleClearOverdue = async (id: number) => {
    try {
      await clientApi.patch(`/api/v1/customers/${id}/credit`, { clear_overdue: true })
      toast.success("Overdue cleared")
      await loadCustomers()
    } catch (err) {
      toast.error("Failed to clear overdue")
    }
  }

  const handleExtendCredit = async () => {
    if (!extendCreditId || extendAmount <= 0) return
    try {
      await clientApi.patch(`/api/v1/customers/${extendCreditId}/credit`, { additional_credit: extendAmount })
      toast.success(`Credit limit extended by ₹${extendAmount.toFixed(2)}`)
      setExtendCreditId(null)
      setExtendAmount(0)
      await loadCustomers()
    } catch (err) {
      toast.error("Failed to extend credit")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Khata</h1>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingCustomer(null); setDialogOpen(true) }}>
          <Plus className="size-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted border-0 h-11 w-full"
            inputMode="search"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="max-sm:hidden">Email</TableHead>
              <TableHead className="max-sm:hidden">Phone</TableHead>
              <TableHead className="max-sm:hidden">Credit Used</TableHead>
              <TableHead className="max-sm:hidden">Price Tier</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No customers found</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">Add your first customer to start tracking khata.</p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingCustomer(null); setDialogOpen(true) }}>
                      <Plus className="size-4 mr-2" /> Add Customer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                    <div className="font-medium">{customer.company_name || "—"}</div>
                    <div className="sm:hidden flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{customer.email || "—"}</span>
                      <span>₹{customer.credit_used.toFixed(2)}</span>
                    </div>
                  </TableCell>
                <TableCell>{customer.contact_person || "—"}</TableCell>
                <TableCell className="text-sm max-sm:hidden">{customer.email || "—"}</TableCell>
                <TableCell className="text-sm max-sm:hidden">{customer.phone || "—"}</TableCell>
                <TableCell className="max-sm:hidden">
                  <span className={customer.credit_used > 0 ? "text-amber-600 font-medium" : "text-foreground"}>
                    ₹{customer.credit_used.toFixed(2)}
                  </span>
                  {customer.credit_limit > 0 && (
                    <span className="text-muted-foreground text-xs ml-1">
                      / ₹{customer.credit_limit.toFixed(2)}
                    </span>
                  )}
                  {customer.credit_limit > 0 && (() => {
                    const remaining = customer.credit_limit - customer.credit_used
                    return (
                      <div className={`text-xs mt-0.5 ${remaining < 0 ? "text-destructive font-medium" : "text-success"}`}>
                        {remaining < 0 ? "Overdue: " : "Remaining: "}₹{remaining.toFixed(2)}
                      </div>
                    )
                  })()}
                </TableCell>
                <TableCell className="max-sm:hidden">
                  <Badge variant="outline" className="text-xs capitalize">{customer.price_tier}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {customer.credit_used > customer.credit_limit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-amber-500 hover:bg-accent hover:text-amber-600"
                        title="Clear Overdue"
                        onClick={() => handleClearOverdue(customer.id)}
                      >
                        <Ban className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-green-500 hover:bg-accent hover:text-green-600"
                      title="Extend Credit"
                      onClick={() => { setExtendCreditId(customer.id); setExtendAmount(0) }}
                    >
                      <ArrowUpCircle className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground/80"
                      onClick={() => { setEditingCustomer(customer); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteConfirmId(customer.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
          </TableBody>
        </Table>
      </div>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingCustomer ? handleUpdate : handleCreate}
        customer={editingCustomer}
      />

      <Dialog open={extendCreditId !== null} onOpenChange={(open) => { if (!open) { setExtendCreditId(null); setExtendAmount(0) }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Credit Limit</DialogTitle>
            <DialogDescription>Enter the additional credit amount to add to the current limit.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Additional Credit Amount (₹)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={extendAmount || ""}
              onChange={(e) => setExtendAmount(parseFloat(e.target.value) || 0)}
              className="rounded-xl border-border h-11"
            />
          </div>
          <DialogFooter>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5" onClick={() => { setExtendCreditId(null); setExtendAmount(0) }}>Cancel</Button>
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-5" onClick={handleExtendCredit} disabled={extendAmount <= 0}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>Are you sure you want to delete this customer? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-5" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CustomerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  customer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CustomerFormData) => Promise<void>
  customer?: Customer | null
}) {
  const [form, setForm] = useState<CustomerFormData>({
    company_name: customer?.company_name || "",
    contact_person: customer?.contact_person || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    gst_number: "",
    credit_limit: customer?.credit_limit || 0,
    price_tier: customer?.price_tier || "standard",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name?.trim() && !form.contact_person?.trim()) {
      toast.error("Name or contact person is required")
      return
    }
    if (!form.credit_limit || form.credit_limit <= 0) {
      toast.error("Credit limit must be greater than 0")
      return
    }
    setLoading(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Khata Customer" : "Add Khata Customer"}</DialogTitle>
          <DialogDescription>{customer ? "Update customer details" : "Add a new customer to your khata"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Name *</label>
              <Input value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="rounded-xl border-border h-11" required inputMode="text" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Contact Person *</label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="rounded-xl border-border h-11" required inputMode="text" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border-border h-11" inputMode="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border-border h-11" inputMode="tel" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Credit Limit * (must be {">"} 0)</label>
              <Input type="number" step="0.01" min="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} className="rounded-xl border-border h-11" required inputMode="decimal" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Price Tier</label>
              <Select value={form.price_tier} onValueChange={(val) => setForm({ ...form, price_tier: val ?? "standard" })}>
                <SelectTrigger className="rounded-xl border-border h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priceTiers.map((tier) => (
                    <SelectItem key={tier} value={tier} className="capitalize">{tier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-5">{loading ? "Saving..." : customer ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
