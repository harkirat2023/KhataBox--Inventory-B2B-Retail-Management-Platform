"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export type EditStockMode = "add" | "remove" | "adjust"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  currentStock: number
  mode: EditStockMode
  setMode: (mode: EditStockMode) => void
  addQty: number
  setAddQty: (qty: number) => void
  setStockQty: (qty: number) => void
  setSetStockQty: (qty: number) => void
  onConfirm: () => Promise<void>
  onQtyValueChange: (qty: number) => void
}

export function EditStockModal({
  open,
  onOpenChange,
  productName,
  currentStock,
  mode,
  setMode,
  addQty,
  setAddQty,
  setStockQty,
  setSetStockQty,
  onConfirm,
  onQtyValueChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [localAdjustValue, setLocalAdjustValue] = useState<string>(String(currentStock))

  useEffect(() => {
    setLocalAdjustValue(String(currentStock))
  }, [currentStock])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  const getQuantity = () => {
    if (mode === "adjust") return currentStock
    return addQty
  }

  const isValid = () => {
    if (mode === "adjust") {
      const val = parseInt(localAdjustValue)
      return !isNaN(val) && val >= 0
    }
    return Number.isInteger(addQty) && addQty > 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Stock - {productName}</DialogTitle>
          <DialogDescription>
            Current stock: {currentStock} units
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Action</label>
            <Select value={mode} onValueChange={(val) => setMode(val as EditStockMode)}>
              <SelectTrigger className="rounded-xl border-border h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock (+)</SelectItem>
                <SelectItem value="remove">Remove Stock (-)</SelectItem>
                <SelectItem value="adjust">Set Stock (replace)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "add" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Quantity to Add</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
                className="rounded-xl border-border h-11"
              />
            </div>
          )}

          {mode === "remove" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Quantity to Remove</label>
              <Input
                type="number"
                min="1"
                max={currentStock}
                step="1"
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
                className="rounded-xl border-border h-11"
              />
              <p className="text-xs text-muted-foreground">Maximum removable: {currentStock}</p>
            </div>
          )}

          {mode === "adjust" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Set Stock To</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={localAdjustValue}
                onChange={(e) => {
                  setLocalAdjustValue(e.target.value)
                  const parsed = parseInt(e.target.value)
                  if (!isNaN(parsed)) {
                    setSetStockQty(parsed)
                    onQtyValueChange(parsed)
                  }
                }}
                className="rounded-xl border-border h-11"
              />
            </div>
          )}

          <div className="bg-muted border border-border rounded-xl p-3">
            <p className="text-sm text-foreground/80">
              <span className="font-medium">New stock will be:</span>{" "}
              <span className="font-semibold">
                {mode === "add"
                  ? currentStock + addQty
                  : mode === "remove"
                  ? Math.max(0, currentStock - addQty)
                  : currentStock}
              </span>{" "}
              units
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white rounded-xl"
            onClick={handleConfirm}
            disabled={loading || !isValid()}
          >
            {loading ? "Updating..." : "Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}