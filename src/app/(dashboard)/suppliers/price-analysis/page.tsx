"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Search } from "lucide-react"
import Link from "next/link"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SupplierPriceAnalysis, PriceAnalysisItem } from "@/types/price-analysis"
import { clientApi } from "@/lib/client-api"

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 35) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{margin}%</Badge>
  if (margin >= 20) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{margin}%</Badge>
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{margin}%</Badge>
}

export default function PriceAnalysisPage() {
  const [data, setData] = useState<SupplierPriceAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    clientApi.get<SupplierPriceAnalysis[]>("/api/v1/suppliers/price-analysis")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const allItems = data.flatMap((s) => s.items)
  const filteredItems = allItems.filter(
    (i) =>
      i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      i.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      i.product_sku.toLowerCase().includes(search.toLowerCase())
  )

  const bySupplier = activeTab === "all"
    ? data
    : data.filter((s) => s.supplier_id.toString() === activeTab)

  const totalAvgMargin = allItems.length
    ? (allItems.reduce((sum, i) => sum + i.margin_percent, 0) / allItems.length).toFixed(1)
    : "0"

  const highMargin = allItems.filter((i) => i.margin_percent >= 35).length
  const lowMargin = allItems.filter((i) => i.margin_percent < 20).length

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Price Analysis</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAvgMargin}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across {allItems.length} products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Margin (&ge;35%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{highMargin}</div>
            <p className="text-xs text-muted-foreground mt-1">Products with good profitability</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Margin (&lt;20%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowMargin}</div>
            <p className="text-xs text-muted-foreground mt-1">Products needing price review</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search product, supplier, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Suppliers</TabsTrigger>
          {data.filter((s) => s.total_items > 0).map((s) => (
            <TabsTrigger key={s.supplier_id} value={s.supplier_id.toString()}>
              {s.supplier_name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {bySupplier.map((group) => {
            const groupItems = search
              ? group.items.filter(
                  (i) =>
                    i.product_name.toLowerCase().includes(search.toLowerCase()) ||
                    i.product_sku.toLowerCase().includes(search.toLowerCase())
                )
              : group.items

            if (groupItems.length === 0) return null

            return (
              <div key={group.supplier_id} className="mb-6">
                {activeTab === "all" && (
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{group.supplier_name}</h3>
                    <span className="text-sm text-muted-foreground">
                      Avg Margin: <strong>{group.avg_margin_percent}%</strong> &middot; {group.total_items} products
                    </span>
                  </div>
                )}
                <div className="rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Supplier Price</TableHead>
                        <TableHead className="text-right">Selling Price</TableHead>
                        <TableHead className="text-right">Profit/Unit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupItems.map((item) => (
                        <TableRow key={`${item.product_id}-${item.supplier_id}`}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.product_sku}</TableCell>
                          <TableCell className="text-sm">{item.category}</TableCell>
                          <TableCell className="text-right">₹{item.last_supplier_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{item.current_selling_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{item.profit_per_unit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <MarginBadge margin={item.margin_percent} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })}

          {search && filteredItems.length === 0 && (
            <div className="text-center text-muted-foreground py-12">No products match your search.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
