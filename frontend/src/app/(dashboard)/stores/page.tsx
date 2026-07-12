"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, Store as StoreIcon } from "lucide-react"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

interface Store {
  id: number
  name: string
  address: string | null
  is_active: boolean
}

interface StoreFormData {
  name: string
  address: string
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [form, setForm] = useState<StoreFormData>({ name: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadStores = useCallback(async () => {
    try {
      setStores(await clientApi.get<Store[]>("/api/v1/stores/"))
    } catch { console.error("Failed to load stores") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStores() }, [loadStores])

  const openCreate = () => {
    setEditingStore(null)
    setForm({ name: "", address: "" })
    setDialogOpen(true)
  }

  const openEdit = (store: Store) => {
    setEditingStore(store)
    setForm({ name: store.name, address: store.address || "" })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      if (editingStore) {
        await clientApi.put(`/api/v1/stores/${editingStore.id}`, form)
        toast.success("Store updated")
      } else {
        await clientApi.post("/api/v1/stores/", form)
        toast.success("Store created")
      }
      setDialogOpen(false)
      await loadStores()
    } catch { toast.error("Failed to save store") }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try {
      await clientApi.delete(`/api/v1/stores/${id}`)
      toast.success("Store deleted")
      await loadStores()
    } catch { toast.error("Failed to delete store") }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Stores</h1>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={openCreate}><Plus className="size-4 mr-2" /> Add Store</Button>
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-border shadow-sm">
            <StoreIcon className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No stores found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first store to get started.</p>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={openCreate}>
              <Plus className="size-4 mr-2" /> Add Store
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.address || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${s.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted hover:text-foreground/80 rounded-xl" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl" onClick={() => handleDelete(s.id)}><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStore ? "Edit Store" : "Add Store"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Store name" className="rounded-xl border-border h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Store address" className="rounded-xl border-border h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-5" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
