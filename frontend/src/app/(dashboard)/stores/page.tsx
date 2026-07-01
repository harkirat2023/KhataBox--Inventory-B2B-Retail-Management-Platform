"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
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

  const loadStores = useCallback(async () => {
    try {
      setStores(await clientApi.get<Store[]>("/api/v1/stores/"))
    } catch { console.error("Failed to load stores") }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stores</h1>
        <Button onClick={openCreate}><Plus className="size-4 mr-2" /> Add Store</Button>
      </div>

      <div className="rounded-lg border">
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {stores.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No stores found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStore ? "Edit Store" : "Add Store"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Store name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Store address" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
