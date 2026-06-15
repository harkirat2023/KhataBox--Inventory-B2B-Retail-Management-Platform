"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Plus, Search, Pencil, Trash2, Upload, QrCode } from "lucide-react"
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
import { Product, ProductFormData } from "@/types/product"
import { Store } from "@/types/store"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [search, setSearch] = useState("")
  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      const params = storeFilter && storeFilter !== "all" ? `?store_id=${storeFilter}` : ""
      const data = await clientApi.get<Product[]>(`/api/v1/products/${params}`)
      setProducts(data)
    } catch (err) {
      console.error("Failed to load products", err)
    }
  }, [storeFilter])

  const loadStores = useCallback(async () => {
    try {
      setStores(await clientApi.get<Store[]>("/api/v1/stores/"))
    } catch {}
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadStores() }, [loadStores])

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
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
      const text = await file.text()
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
      if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return }
      const headers = parseCsvRow(lines[0])
      const rows = lines.slice(1).map(parseCsvRow)
      let success = 0, failed = 0
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2
        if (row.length !== headers.length) { failed++; toast.error(`Row ${rowNum}: column count mismatch`); continue }
        const entry = Object.fromEntries(headers.map((h, j) => [h, row[j]]))
        const payload: ProductFormData = {
          name: entry.name || entry.Name || entry["Product Name"] || "",
          sku: entry.sku || entry.SKU || "",
          category: entry.category || entry.Category || "",
          brand: entry.brand || entry.Brand || "",
          description: entry.description || entry.Description || "",
          cost_price: parseFloat(entry.cost_price || entry["Cost Price"] || entry.costPrice || "0") || 0,
          selling_price: parseFloat(entry.selling_price || entry["Selling Price"] || entry.sellingPrice || "0") || 0,
          stock_quantity: parseInt(entry.stock_quantity || entry["Stock Quantity"] || entry.stockQuantity || "0", 10) || 0,
          reorder_threshold: parseInt(entry.reorder_threshold || entry["Reorder Threshold"] || entry.reorderThreshold || "10", 10) || 10,
          store_id: storeFilter && storeFilter !== "all" ? parseInt(storeFilter) : null,
        }
        if (!payload.name || !payload.sku) { failed++; toast.error(`Row ${rowNum}: name and sku are required`); continue }
        try {
          await clientApi.post("/api/v1/products/", payload)
          success++
        } catch { failed++ }
      }
      if (success > 0) toast.success(`Imported ${success} product${success > 1 ? "s" : ""} successfully`)
      if (failed > 0) toast.error(`${failed} row${failed > 1 ? "s" : ""} failed`)
      await loadProducts()
    } catch (err) {
      toast.error("Failed to read CSV file")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleCreate = async (data: ProductFormData) => {
    await clientApi.post<Product>("/api/v1/products/", data)
    await loadProducts()
  }

  const handleUpdate = async (data: ProductFormData) => {
    if (!editingProduct) return
    await clientApi.put<Product>(`/api/v1/products/${editingProduct.id}`, data)
    setEditingProduct(null)
    await loadProducts()
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return
    await clientApi.delete(`/api/v1/products/${id}`)
    await loadProducts()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="size-4 mr-2" /> {importing ? "Importing..." : "Import CSV"}
          </Button>
          <Button onClick={() => { setEditingProduct(null); setDialogOpen(true) }}>
            <Plus className="size-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={storeFilter} onValueChange={(val) => val && setStoreFilter(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  No products found. Add your first product to get started.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{product.store_name || "—"}</TableCell>
                <TableCell>
                  <span className={product.stock_quantity <= product.reorder_threshold ? "text-destructive font-medium" : ""}>
                    {product.stock_quantity}
                  </span>
                </TableCell>
                <TableCell>₹{product.selling_price.toFixed(2)}</TableCell>
                <TableCell>
                  {product.stock_quantity === 0 ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : product.stock_quantity <= product.reorder_threshold ? (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Low Stock</Badge>
                  ) : (
                    <Badge variant="secondary">In Stock</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => { setQrProduct(product) }}
                      title="QR Identity"
                    >
                      <QrCode className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => { setEditingProduct(product); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => handleDelete(product.id)}
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
    </div>
  )
}
