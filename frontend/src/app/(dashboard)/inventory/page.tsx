"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Search, Pencil, Trash2, Upload, QrCode, ScanLine, Loader2, Package } from "lucide-react"
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

export default function InventoryPage() {
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

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = storeFilter && storeFilter !== "all" ? `?store_id=${storeFilter}` : ""
      const data = await clientApi.get<Product[]>(`/api/v1/products/${params}`)
      setProducts(data)
    } catch (err) {
      console.error("Failed to load products", err)
    } finally {
      setLoading(false)
    }
  }, [storeFilter])

  const loadStores = useCallback(async () => {
    try {
      setStores(await clientApi.get<Store[]>("/api/v1/stores/"))
    } catch {}
  }, [])

  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setEditingProduct(null)
      setDialogOpen(true)
    }
  }, [searchParams])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadStores() }, [loadStores])

  useEffect(() => {
    if (stores.length === 1 && storeFilter === "all") {
      setStoreFilter(String(stores[0].id))
    }
  }, [stores, storeFilter])

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
        const rowNum = i + 2
        if (row.length !== headers.length) { failed++; toast.error(`Row ${rowNum}: column count mismatch`); continue }
        const entry = Object.fromEntries(headers.map((h, j) => [h, row[j]]))
        const payload: ProductFormData = {
          name: entry.name || entry.Name || entry["Product Name"] || "",
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
        if (!payload.name) { failed++; toast.error(`Row ${rowNum}: name is required`); continue }
        if (!payload.cost_price || payload.cost_price <= 0) { failed++; toast.error(`Row ${rowNum}: cost price is required and must be > 0`); continue }
        if (!payload.selling_price || payload.selling_price <= 0) { failed++; toast.error(`Row ${rowNum}: selling price is required and must be > 0`); continue }
        if (!payload.sku) payload.sku = payload.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50) + "-" + Date.now().toString(36) + i.toString(36)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportCsv} />
          <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="size-4 mr-2" /> {importing ? "Importing..." : "Import"}
          </Button>
          <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200" onClick={() => setScanDialogOpen(true)}>
            <ScanLine className="size-4 mr-2" /> Scan QR
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingProduct(null); setDialogOpen(true) }}>
            <Plus className="size-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-slate-50 border-0 h-11"
          />
        </div>
        {stores.length <= 1 ? (
          stores.length === 1 ? (
            <Input
              className="w-[180px] rounded-xl bg-slate-50 border-0 h-11"
              value={stores[0]?.name ?? ""}
              disabled
            />
          ) : (
            <Select value={storeFilter} onValueChange={(val) => val && setStoreFilter(val)}>
              <SelectTrigger className="w-[180px] rounded-xl border-slate-200 h-11">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
              </SelectContent>
            </Select>
          )
        ) : (
          <Select value={storeFilter} onValueChange={(val) => val && setStoreFilter(val)}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 h-11">
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                    <Package className="size-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No products found</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-xs">Add your first product to get started with inventory tracking.</p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={() => { setEditingProduct(null); setDialogOpen(true) }}>
                      <Plus className="size-4 mr-2" /> Add Product
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-sm text-slate-500">{product.store_name || "—"}</TableCell>
                <TableCell>
                  <span className={product.stock_quantity <= product.reorder_threshold ? "text-red-600 font-medium" : ""}>
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
                      className="size-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => { setQrProduct(product) }}
                      title="QR Identity"
                    >
                      <QrCode className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => { setEditingProduct(product); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                      onClick={() => handleDelete(product.id)}
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
