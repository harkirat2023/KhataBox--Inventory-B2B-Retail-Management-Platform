"use client"

import { useEffect, useState } from "react"
import { Search, Printer, QrCode } from "lucide-react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    clientApi.get<Product[]>("/api/v1/products/").then((data) => { setProducts(data); setLoading(false) }).catch(() => { toast.error("Failed to load products"); setLoading(false) })
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
        <h1 className="text-3xl font-bold text-slate-900">QR Labels</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200" onClick={handlePrint} disabled={selected.size === 0 || generating}>
          <Printer className="size-4 mr-2" /> {generating ? "Generating..." : `Print Labels (${selected.size})`}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input placeholder="Search products..." className="rounded-xl bg-slate-50 border-0 h-11 pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                <TableCell className="text-sm text-slate-500">{p.sku}</TableCell>
                <TableCell className="text-slate-700">&#x20B9;{p.selling_price.toFixed(2)}</TableCell>
                <TableCell>{p.stock_quantity}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center size-12 rounded-xl bg-slate-100 mb-4">
                      <QrCode className="size-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">No products found</p>
                    <p className="text-sm text-slate-500 mt-1">No products match your search query.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      )}
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
