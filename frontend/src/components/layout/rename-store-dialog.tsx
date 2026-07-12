"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"

interface RenameStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  store: { id: number; name: string }
  onRenamed: (newName: string) => void
}

export function RenameStoreDialog({ open, onOpenChange, store, onRenamed }: RenameStoreDialogProps) {
  const [name, setName] = useState(store.name)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Store name cannot be empty")
      return
    }
    setSaving(true)
    try {
      await clientApi.put(`/api/v1/stores/${store.id}`, { name: trimmed })
      onRenamed(trimmed)
      toast.success("Store renamed successfully")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename store")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Store</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter store name"
            className="rounded-xl border-slate-200 h-11"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
