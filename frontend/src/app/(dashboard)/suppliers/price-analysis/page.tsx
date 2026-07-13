"use client"

import { useEffect, useState, useMemo } from "react"
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, Store } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SupplierPriceAnalysis } from "@/types/price-analysis"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"

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
  const [sortBy, setSortBy] = useState<string>("margin_desc")
  const { activeStore } = useStoreContext()

  useEffect(() => {
    clientApi.get<SupplierPriceAnalysis[]>("/api/v1/suppliers/price-analysis")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const allItems = useMemo(() => {
    return data.flatMap((s) => s.items).filter(
      (i) =>
        i.product_name.toLowerCase().includes(search.toLowerCase()) ||
        i.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
        i.product_sku.toLowerCase().includes(search.toLowerCase())
    )
  }, [data, search])

  const sortedItems = useMemo(() => {
    const sorted = [...allItems]
    switch (sortBy) {
      case "margin_asc": return sorted.sort((a, b) => a.margin_percent - b.margin_percent)
      case "margin_desc": return sorted.sort((a, b) => b.margin_percent - a.margin_percent)
      case "price_asc": return sorted.sort((a, b) => a.current_selling_price - b.current_selling_price)
      case "price_desc": return sorted.sort((a, b) => b.current_selling_price - a.current_selling_price)
      default: return sorted
    }
  }, [allItems, sortBy])

  const tableItems = useMemo(() => {
    if (activeTab === "all") return sortedItems
    const supplier = data.find((s) => s.supplier_id.toString() === activeTab)
    if (!supplier) return []
    return sortedItems.filter((i) => i.supplier_id === supplier.supplier_id)
  }, [sortedItems, activeTab, data])

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
    <div className="space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground/80 rounded-xl">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Price Analysis</h1>
            <p className="text-sm text-muted-foreground">Compare supplier pricing and margins</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Average Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalAvgMargin}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across {allItems.length} products</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">High Margin (&ge;35%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{highMargin}</div>
            <p className="text-xs text-muted-foreground mt-1">Products with good profitability</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Low Margin (&lt;20%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowMargin}</div>
            <p className="text-xs text-muted-foreground mt-1">Products needing price review</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products, suppliers, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl bg-card border-border h-11 pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
          <SelectTrigger className="w-[180px] rounded-xl border-border h-11">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="margin_desc">Margin: High to Low</SelectItem>
            <SelectItem value="margin_asc">Margin: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
          </SelectContent>
        </Select>
        {activeStore?.id && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Store className="size-3" />
            {activeStore.name}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-3">
            <TabsList className="rounded-xl bg-muted p-1">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">All Suppliers</TabsTrigger>
              {data.map((s) => (
                <TabsTrigger key={s.supplier_id} value={String(s.supplier_id)} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  {s.supplier_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value={activeTab} className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-sm text-muted-foreground">
                      No products match your search
                    </TableCell>
                  </TableRow>
                ) : (
                  tableItems.map((item, i) => {
                    const savings = item.current_selling_price - item.current_cost_price
                    const savingPct = item.current_cost_price > 0 ? ((item.current_selling_price - item.current_cost_price) / item.current_cost_price * 100) : 0
                    return (
                      <TableRow key={`${item.product_id}-${item.supplier_id}-${i}`}>
                        <TableCell className="font-medium text-foreground">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{item.product_sku}</TableCell>
                        <TableCell className="text-foreground/80">{item.supplier_name}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">₹{item.current_cost_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">₹{item.current_selling_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <MarginBadge margin={item.margin_percent} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-mono text-sm">₹{savings.toFixed(2)}</span>
                            {savingPct > 30 ? (
                              <TrendingUp className="size-3.5 text-emerald-500" />
                            ) : savingPct > 15 ? (
                              <Minus className="size-3.5 text-amber-500" />
                            ) : (
                              <TrendingDown className="size-3.5 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
