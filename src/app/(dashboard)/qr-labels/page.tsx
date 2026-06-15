"use client"

import { useEffect, useState } from "react"
import { Search, Printer, Check, X } from "lucide-react"
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
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

interface Product {
  id: number
  name: string
  sku: string
  category: string
  selling_price: number
  stock_quantity: number
}

export default function QRLabelsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    clientApi.get<Product[]>("/api/v1/products/").then(setProducts).catch(() => toast.error("Failed to load products"))
  }, [])

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selectAll) { setSelected(new Set()); setSelectAll(false) }
    else { setSelected(new Set(filtered.map(p => p.id))); setSelectAll(true) }
  }

  const handlePrint = () => {
    if (selected.size === 0) { toast.error("Select at least one product"); return }
    const ids = Array.from(selected).join(",")
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const win = window.open(`${apiUrl}/api/v1/qrcodes/batch?ids=${ids}`, "_blank")
    if (win) {
      win.onload = () => { win.print() }
      toast.success(`Printing ${selected.size} labels`)
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">QR Labels</h1>
        <Button onClick={handlePrint} disabled={selected.size === 0}>
          <Printer className="size-4 mr-2" /> Print Labels ({selected.size})
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search products..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input type="checkbox" checked={selectAll && filtered.length > 0} onChange={toggleAll} className="size-4" />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                <TableCell>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="size-4" />
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.sku}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{p.category}</Badge></TableCell>
                <TableCell>₹{p.selling_price}</TableCell>
                <TableCell>{p.stock_quantity}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
