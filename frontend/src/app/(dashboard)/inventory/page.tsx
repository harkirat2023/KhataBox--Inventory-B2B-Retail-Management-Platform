"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Search, Pencil, Trash2, Upload, QrCode, ScanLine, Package, Save } from "lucide-react"
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
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { ProductQrDialog } from "@/components/products/product-qr-dialog"
import { InventoryQrScanDialog } from "@/components/inventory/inventory-qr-scan-dialog"
import { Product, ProductFormData } from "@/types/product"
import { Store } from "@/types/store"
import { Skeleton } from "@/components/ui/skeleton"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import * as XLSX from "xlsx"

type DirtyField = Partial<Pick<Product, "reorder_threshold" | "stock_quantity" | "selling_price">>

export default function InventoryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [search, setSearch] = useState("")
  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const dirtyChangesRef = useRef<Record<number, DirtyField>>({})
  const [dirtyVersion, setDirtyVersion] = useState(0)

  const unsavedCount = Object.keys(dirtyChangesRef.current).length

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = storeFilter && storeFilter !== "all" ? `?store_id=${storeFilter}` : ""
      const data = await clientApi.get<Product[]>(`/api/v1/products/${params}`)
      setProducts(data)
    } catch {
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [storeFilter])

  const loadStores = useCallback(async () => {
    try {
      setStores(await clientApi.get<Store[]>("/api/v1/stores/"))
    } catch {}
  }, [])

  const saveAll = useCallback(async (silent = false) => {
    const changes = dirtyChangesRef.current
    const ids = Object.keys(changes)
    if (ids.length === 0) return
    if (!silent) setSaving(true)
    const updates = ids.map((idStr) => ({
      id: Number(idStr),
      ...changes[Number(idStr)],
    }))
    try {
      await clientApi.put<{ updated: number }>("/api/v1/products/bulk-update", { updates })
      dirtyChangesRef.current = {}
      setDirtyVersion((v) => v + 1)
      if (!silent) toast.success(`Saved ${updates.length} change${updates.length > 1 ? "s" : ""}`)
      await loadProducts()
    } catch {
      if (!silent) toast.error("Failed to save changes")
    } finally {
      if (!silent) setSaving(false)
    }
  }, [loadProducts])

  const trackChange = useCallback((productId: number, field: keyof DirtyField, value: number) => {
    dirtyChangesRef.current = {
      ...dirtyChangesRef.current,
      [productId]: {
        ...dirtyChangesRef.current[productId],
        [field]: value,
      },
    }
    setDirtyVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    const onLeave = () => {
      if (Object.keys(dirtyChangesRef.current).length > 0) {
        saveAll(true)
      }
    }
    window.addEventListener("beforeunload", onLeave)
    return () => {
      window.removeEventListener("beforeunload", onLeave)
      onLeave()
    }
  }, [saveAll])

  useEffect(() => {
    const onFocus = () => { loadProducts() }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [loadProducts])

  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setEditingProduct(null)
      setDialogOpen(true)
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [searchParams])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadStores() }, [loadStores])

  useEffect(() => {
    if (stores.length === 1 && storeFilter === "all") {
      setStoreFilter(String(stores[0].id))
    }
  }, [stores, storeFilter])

  const getEffectiveProduct = (p: Product): Product => {
    const dirty = dirtyChangesRef.current[p.id]
    if (!dirty) return p
    return { ...p, ...dirty }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  )

  const parseCsvRow = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue }
      current += char
    }
    result.push(current.trim())
    return result
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const ext = file.name.split(".").pop()?.toLowerCase()
      let rows: string[][] = []
      let headers: string[] = []

      if (ext === "csv") {
        const text = new TextDecoder().decode(buffer)
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
        if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return }
        headers = parseCsvRow(lines[0])
        rows = lines.slice(1).map(parseCsvRow)
      } else {
        const workbook = XLSX.read(buffer, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!sheet) { toast.error("Excel file is empty"); return }
        const data: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        if (data.length < 2) { toast.error("Excel must have a header row and at least one data row"); return }
        headers = (data[0] || []).map((h) => String(h || ""))
        rows = data.slice(1).map((row) => row.map((cell) => String(cell ?? "")))
      }

      let success = 0, failed = 0
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row.length !== headers.length) { failed++; continue }
        const entry = Object.fromEntries(headers.map((h, j) => [h, row[j]]))
        const name = entry.name || entry.Name || entry["Product Name"] || ""
        if (!name) { failed++; continue }
        const payload: ProductFormData = {
          name,
          sku: entry.sku || entry.SKU || "",
          category: entry.category || entry.Category || null,
          brand: entry.brand || entry.Brand || "",
          description: entry.description || entry.Description || "",
          cost_price: parseFloat(entry.cost_price || entry["Cost Price"] || entry.costPrice || "0") || 0,
          selling_price: parseFloat(entry.selling_price || entry["Selling Price"] || entry.sellingPrice || "0") || 0,
          stock_quantity: parseInt(entry.stock_quantity || entry["Stock Quantity"] || entry.stockQuantity || "0", 10) || 0,
          reorder_threshold: parseInt(entry.reorder_threshold || entry["Reorder Threshold"] || entry.reorderThreshold || "10", 10) || 10,
          store_id: storeFilter && storeFilter !== "all" ? parseInt(storeFilter) : null,
        }
        if (!payload.selling_price || payload.selling_price <= 0) { failed++; continue }
        if (!payload.sku) payload.sku = payload.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50) + "-" + Date.now().toString(36) + i.toString(36)
        try {
          await clientApi.post("/api/v1/products/", payload)
          success++
        } catch { failed++ }
      }
      if (success > 0) toast.success(`Imported ${success} product${success > 1 ? "s" : ""} successfully`)
      if (failed > 0) toast.error(`${failed} row${failed > 1 ? "s" : ""} failed`)
      await loadProducts()
    } catch {
      toast.error("Failed to read file")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleCreate = async (data: ProductFormData) => {
    try {
      await clientApi.post<Product>("/api/v1/products/", data)
      await loadProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create product")
      throw err
    }
  }

  const handleUpdate = async (data: ProductFormData) => {
    if (!editingProduct) return
    try {
      await clientApi.put<Product>(`/api/v1/products/${editingProduct.id}`, data)
      setEditingProduct(null)
      await loadProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product")
      throw err
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return
    try {
      await clientApi.delete(`/api/v1/products/${id}`)
      await loadProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product")
    }
  }

  const stockStatus = (p: Product) => {
    if (p.stock_quantity === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (p.stock_quantity <= p.reorder_threshold) return { label: "Low Stock", variant: "outline" as const }
    return { label: "In Stock", variant: "secondary" as const }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {unsavedCount > 0 && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-5 transition-all duration-200"
              onClick={() => saveAll()}
              disabled={saving}
            >
              <Save className="size-4 mr-2" />
              {saving ? "Saving..." : `Save All (${unsavedCount})`}
            </Button>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportCsv} />
          <Button className="bg-card border border-border text-foreground/80 hover:bg-muted rounded-xl h-11 px-5 transition-all duration-200" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="size-4 mr-2" /> {importing ? "Importing..." : "Import"}
          </Button>
          <Button className="bg-card border border-border text-foreground/80 hover:bg-muted rounded-xl h-11 px-5 transition-all duration-200" onClick={() => router.push("/inventory/scan")}>
            <ScanLine className="size-4 mr-2" /> Scan
          </Button>
          <Button className="bg-card border border-border text-foreground/80 hover:bg-muted rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setScanDialogOpen(true)}>
            <QrCode className="size-4 mr-2" /> Scan QR
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingProduct(null); setDialogOpen(true) }}>
            <Plus className="size-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted border-0 h-11"
            inputMode="search"
          />
        </div>
        {stores.length <= 1 ? (
          stores.length === 1 ? (
            <Input
              className="w-[180px] rounded-xl bg-muted border-0 h-11"
              value={stores[0]?.name ?? ""}
              disabled
              inputMode="text"
            />
          ) : (
            <Select value={storeFilter} onValueChange={(val) => val && setStoreFilter(val)}>
              <SelectTrigger className="w-[180px] rounded-xl border-border h-11">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
              </SelectContent>
            </Select>
          )
        ) : (
          <Select value={storeFilter} onValueChange={(val) => val && setStoreFilter(val)}>
            <SelectTrigger className="w-[180px] rounded-xl border-border h-11">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <Package className="size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No products found</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">Add your first product to get started with inventory tracking.</p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingProduct(null); setDialogOpen(true) }}>
                      <Plus className="size-4 mr-2" /> Add Product
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => {
                const effective = getEffectiveProduct(product)
                const status = stockStatus(effective)
                const isDirty = !!dirtyChangesRef.current[product.id]
                return (
                <TableRow key={product.id} className={isDirty ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                  <TableCell className="font-medium">{effective.name}</TableCell>
                  <TableCell className="font-mono text-sm">{effective.sku}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{effective.store_name || "—"}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 w-20 text-xs rounded-lg"
                      value={effective.stock_quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val >= 0) {
                          setProducts((prev) =>
                            prev.map((p) => p.id === product.id ? { ...p, stock_quantity: val } : p)
                          )
                          trackChange(product.id, "stock_quantity", val)
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 max-w-[100px]">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-16 text-xs rounded-lg"
                        value={effective.reorder_threshold}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val) && val >= 0) {
                            setProducts((prev) =>
                              prev.map((p) => p.id === product.id ? { ...p, reorder_threshold: val } : p)
                            )
                            trackChange(product.id, "reorder_threshold", val)
                          }
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 w-24 text-xs rounded-lg"
                      value={effective.selling_price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val >= 0) {
                          setProducts((prev) =>
                            prev.map((p) => p.id === product.id ? { ...p, selling_price: val } : p)
                          )
                          trackChange(product.id, "selling_price", val)
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {status.variant === "destructive" ? (
                      <Badge className="bg-red-600 text-white dark:bg-red-500 dark:text-white">{status.label}</Badge>
                    ) : status.variant === "outline" ? (
                      <Badge className="bg-amber-600 text-white dark:bg-amber-500 dark:text-white">{status.label}</Badge>
                    ) : (
                      <Badge className="bg-green-600 text-white dark:bg-green-500 dark:text-white">{status.label}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground/80"
                        onClick={() => { setQrProduct(product) }}
                        title="QR Identity"
                      >
                        <QrCode className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground/80"
                        onClick={() => { setEditingProduct(product); setDialogOpen(true) }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        product={editingProduct}
      />
      {qrProduct && (
        <ProductQrDialog
          open={!!qrProduct}
          onOpenChange={(open) => { if (!open) setQrProduct(null) }}
          product={qrProduct}
        />
      )}
      <InventoryQrScanDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onProductChanged={loadProducts}
      />
    </div>
  )
}
