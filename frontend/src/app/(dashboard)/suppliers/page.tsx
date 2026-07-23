"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Supplier, SupplierFormData } from "@/types/supplier"
import { clientApi } from "@/lib/client-api"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await clientApi.get<Supplier[]>("/api/v1/suppliers/")
      setSuppliers(data)
    } catch (err) {
      console.error("Failed to load suppliers", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_person.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (data: SupplierFormData) => {
    await clientApi.post<Supplier>("/api/v1/suppliers/", data)
    await loadSuppliers()
  }

  const handleUpdate = async (data: SupplierFormData) => {
    if (!editingSupplier) return
    await clientApi.put<Supplier>(`/api/v1/suppliers/${editingSupplier.id}`, data)
    setEditingSupplier(null)
    await loadSuppliers()
  }

  const handleDelete = async (id: number) => {
    await clientApi.delete(`/api/v1/suppliers/${id}`)
    setDeleteConfirmId(null)
    await loadSuppliers()
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Suppliers</h1>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingSupplier(null); setDialogOpen(true) }}>
            <Plus className="size-4 mr-2" /> Add Supplier
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-muted border-0 h-11 w-full"
              inputMode="search"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="max-sm:hidden">Contact Person</TableHead>
                  <TableHead className="max-sm:hidden">Email</TableHead>
                  <TableHead className="max-sm:hidden">Phone</TableHead>
                  <TableHead className="max-sm:hidden">Address</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="max-sm:hidden"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="max-sm:hidden"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="max-sm:hidden"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-sm:hidden"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-border shadow-sm">
            <Building2 className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No suppliers found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Add your first supplier to get started.</p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingSupplier(null); setDialogOpen(true) }}>
              <Plus className="size-4 mr-2" /> Add Supplier
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="max-sm:hidden">Contact Person</TableHead>
                  <TableHead className="max-sm:hidden">Email</TableHead>
                  <TableHead className="max-sm:hidden">Phone</TableHead>
                  <TableHead className="max-sm:hidden">Address</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="sm:hidden flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{supplier.contact_person}</span>
                      <span>{supplier.email}</span>
                    </div>
                  </TableCell>
                <TableCell className="max-sm:hidden">{supplier.contact_person}</TableCell>
                <TableCell className="text-sm max-sm:hidden">{supplier.email}</TableCell>
                <TableCell className="text-sm max-sm:hidden">{supplier.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate max-sm:hidden">{supplier.address}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-xl"
                      onClick={() => { setEditingSupplier(supplier); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                       className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl"
                      onClick={() => setDeleteConfirmId(supplier.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingSupplier ? handleUpdate : handleCreate}
        supplier={editingSupplier}
      />

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>Are you sure you want to delete this supplier? This action cannot be undone.</DialogDescription>
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

function SupplierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  supplier,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SupplierFormData) => Promise<void>
  supplier?: Supplier | null
}) {
  const [form, setForm] = useState<SupplierFormData>({
    name: supplier?.name || "",
    contact_person: supplier?.contact_person || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          <DialogTitle>{supplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <DialogDescription>{supplier ? "Update supplier details" : "Add a new supplier"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Company Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl border-border h-11" inputMode="text" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Contact Person</label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} required className="rounded-xl border-border h-11" inputMode="text" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="rounded-xl border-border h-11" inputMode="email" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border-border h-11" inputMode="tel" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Address</label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border-border p-3 text-sm"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-5" disabled={loading}>{loading ? "Saving..." : supplier ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
