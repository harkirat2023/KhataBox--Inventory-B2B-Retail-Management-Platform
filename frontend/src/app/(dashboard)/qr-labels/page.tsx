"use client"

import { useEffect, useState } from "react"
import { Search, Printer } from "lucide-react"
import QRCode from "qrcode"
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
  product_uuid: string
  name: string
  sku: string
  selling_price: number
  stock_quantity: number
}

export default function QRLabelsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [generating, setGenerating] = useState(false)

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

  const handlePrint = async () => {
    if (selected.size === 0) { toast.error("Select at least one product"); return }
    setGenerating(true)
    try {
      const selectedProducts = products.filter(p => selected.has(p.id))
      const labelsHtml = await buildLabelsHtml(selectedProducts)
      const win = window.open("", "_blank")
      if (!win) { toast.error("Popup blocked. Allow popups for this site."); return }
      win.document.write(labelsHtml)
      win.document.close()
      win.onload = () => { win.print() }
      toast.success(`Printing ${selected.size} labels`)
    } catch (err) {
      toast.error("Failed to generate labels")
    } finally {
      setGenerating(false)
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">QR Labels</h1>
        <Button onClick={handlePrint} disabled={selected.size === 0 || generating}>
          <Printer className="size-4 mr-2" /> {generating ? "Generating..." : `Print Labels (${selected.size})`}
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
                <TableCell>&#x20B9;{p.selling_price.toFixed(2)}</TableCell>
                <TableCell>{p.stock_quantity}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

async function buildLabelsHtml(products: Product[]): Promise<string> {
  const labelW = 180
  const labelH = 210
  const cols = 3
  const perPage = 12
  const pages: Product[][] = []
  for (let i = 0; i < products.length; i += perPage) {
    pages.push(products.slice(i, i + perPage))
  }

  let allHtml = "<html><head>"
  allHtml += `<style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .page { width: 190mm; display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 4mm; padding: 2mm; page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .label { width: 58mm; height: 68mm; border: 1px dashed #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3mm; text-align: center; }
    .label img { width: 50mm; height: 50mm; image-rendering: pixelated; }
    .label .name { font-size: 9pt; font-weight: bold; margin-top: 2mm; line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .label .price { font-size: 8pt; color: #555; margin-top: 0.5mm; }
    @media screen { body { background: #eee; padding: 10mm; } .page { background: white; margin: 0 auto 5mm; box-shadow: 0 2px 8px rgba(0,0,0,0.15); } }
  </style></head><body>`

  for (const pageProducts of pages) {
    allHtml += '<div class="page">'
    for (const product of pageProducts) {
      const qrDataUrl = await QRCode.toDataURL(product.product_uuid, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
      allHtml += `<div class="label">
        <img src="${qrDataUrl}" alt="QR" />
        <div class="name">${product.name}</div>
        <div class="price">\u20B9${product.selling_price.toFixed(2)}</div>
      </div>`
    }
    // Fill remaining slots on the last page to maintain grid
    const remaining = perPage - pageProducts.length
    if (remaining > 0) {
      for (let i = 0; i < remaining; i++) {
        allHtml += '<div class="label" style="border: none;"></div>'
      }
    }
    allHtml += "</div>"
  }

  allHtml += "</body></html>"
  return allHtml
}
