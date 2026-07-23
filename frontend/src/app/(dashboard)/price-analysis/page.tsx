"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Package, AlertTriangle,
  BarChart3, ShoppingBag, ArrowUpDown, Target, Truck, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"
import type {
  PriceAnalysisOverview, ProcurementItem, ProfitabilityItem,
} from "@/types/price-analysis"

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 35) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{margin}%</Badge>
  if (margin >= 20) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{margin}%</Badge>
  return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{margin}%</Badge>
}

function TrendIcon({ value, good }: { value: number; good?: boolean }) {
  if (value > 0) return <TrendingUp className={`size-3.5 ${good ? "text-green-500" : "text-red-500"}`} />
  if (value < 0) return <TrendingDown className={`size-3.5 ${good ? "text-red-500" : "text-green-500"}`} />
  return <Minus className="size-3.5 text-muted-foreground" />
}

export default function PriceAnalysisPage() {
  const [data, setData] = useState<PriceAnalysisOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("margin_desc")
  const [tab, setTab] = useState("procurement")
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    clientApi.get<PriceAnalysisOverview>("/api/v1/price-analysis/overview")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const applyLocalUpdate = useCallback((id: number, field: "cost_price" | "selling_price", value: number) => {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        procurement_analysis: prev.procurement_analysis.map(item =>
          item.product_id === id ? { ...item, [field]: value } : item
        ),
        profitability: prev.profitability.map(item => {
          if (item.product_id !== id) return item
          const updated = { ...item, [field]: value }
          updated.gross_profit = updated.selling_price - updated.landed_cost
          updated.gross_margin_pct = updated.selling_price > 0 ? Math.round((updated.gross_profit / updated.selling_price) * 100) : 0
          return updated
        }),
      }
    })
  }, [])

  const handleSavePrice = useCallback(async (id: number, field: "cost_price" | "selling_price", newValue: string) => {
    const parsed = parseFloat(newValue)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Invalid price value")
      return
    }
    setSavingId(id)
    try {
      await clientApi.put(`/api/v1/products/${id}`, { [field]: parsed })
      applyLocalUpdate(id, field, parsed)
      toast.success(`${field === "cost_price" ? "Cost price" : "Selling price"} updated`)
    } catch {
      toast.error("Failed to update price")
    } finally {
      setSavingId(null)
    }
  }, [applyLocalUpdate])

  const filteredProcurement = useMemo(() => {
    if (!data) return []
    let items = [...data.procurement_analysis]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.product_name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case "margin_desc": items.sort((a, b) => b.cost_vs_market_pct - a.cost_vs_market_pct); break
      case "margin_asc": items.sort((a, b) => a.cost_vs_market_pct - b.cost_vs_market_pct); break
      case "price_desc": items.sort((a, b) => b.cost_price - a.cost_price); break
      case "price_asc": items.sort((a, b) => a.cost_price - b.cost_price); break
    }
    return items
  }, [data, search, sortBy])

  const filteredProfitability = useMemo(() => {
    if (!data) return []
    let items = [...data.profitability]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.product_name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case "margin_desc": items.sort((a, b) => b.gross_margin_pct - a.gross_margin_pct); break
      case "margin_asc": items.sort((a, b) => a.gross_margin_pct - b.gross_margin_pct); break
      case "price_desc": items.sort((a, b) => b.selling_price - a.selling_price); break
      case "price_asc": items.sort((a, b) => a.selling_price - b.selling_price); break
    }
    return items
  }, [data, search, sortBy])

  const avgMargin = data?.profitability.length
    ? (data.profitability.reduce((s, i) => s + i.gross_margin_pct, 0) / data.profitability.length).toFixed(1)
    : "0"

  const totalRevenue = data?.profitability.reduce((s, i) => s + i.revenue_projection, 0) || 0
  const totalProfit = data?.profitability.reduce((s, i) => s + i.total_profit, 0) || 0
  const hml = data?.hml || { high: 0, medium: 0, low: 0 }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Price Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Procurement, profitability, and pricing insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground font-medium">Avg Gross Margin</CardTitle>
            <TrendingUp className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{avgMargin}%</div>
            <p className="text-xs text-muted-foreground">Across {data?.profitability.length || 0} products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground font-medium">Projected Revenue</CardTitle>
            <DollarSign className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">At current stock levels</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground font-medium">Projected Profit</CardTitle>
            <Target className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{totalProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Gross profit at current stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total Products</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.total_products || 0}</div>
            <p className="text-xs text-muted-foreground">Active SKUs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="rounded-xl bg-muted p-1 w-max sm:w-auto">
            <TabsTrigger value="procurement" className="rounded-lg">Procurement vs Market</TabsTrigger>
            <TabsTrigger value="profitability" className="rounded-lg">Profitability</TabsTrigger>
            <TabsTrigger value="hml" className="rounded-lg">HML Analysis</TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg">Low Stock Alerts</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-xl bg-card border-border h-11 pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={v => v && setSortBy(v)}>
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
        </div>

        <TabsContent value="procurement" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="max-sm:hidden">SKU</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right max-sm:hidden">Market Price</TableHead>
                    <TableHead className="text-right max-sm:hidden">Diff</TableHead>
                    <TableHead className="text-right">Diff %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcurement.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-sm text-muted-foreground">
                        No products match your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProcurement.map((item: ProcurementItem) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium text-foreground min-w-[140px]">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground max-sm:hidden">{item.sku}</TableCell>
                        <EditablePriceCell
                          value={item.cost_price}
                          productId={item.product_id}
                          field="cost_price"
                          onSave={handleSavePrice}
                          saving={savingId === item.product_id}
                        />
                        <EditablePriceCell
                          value={item.selling_price}
                          productId={item.product_id}
                          field="selling_price"
                          onSave={handleSavePrice}
                          saving={savingId === item.product_id}
                        />
                        <TableCell className="text-right font-mono text-muted-foreground max-sm:hidden">
                          {item.market_price ? `₹${item.market_price.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right max-sm:hidden">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-mono text-sm">₹{item.cost_vs_market_diff.toFixed(2)}</span>
                            <TrendIcon value={item.cost_vs_market_diff} good />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <MarginBadge margin={item.cost_vs_market_pct} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="max-sm:hidden">SKU</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right max-sm:hidden">Landed Cost</TableHead>
                    <TableHead className="text-right max-sm:hidden">Gross Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right max-sm:hidden">GMROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfitability.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-sm text-muted-foreground">
                        No products match your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfitability.map((item: ProfitabilityItem) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium text-foreground min-w-[140px]">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground max-sm:hidden">{item.sku}</TableCell>
                        <EditablePriceCell
                          value={item.cost_price}
                          productId={item.product_id}
                          field="cost_price"
                          onSave={handleSavePrice}
                          saving={savingId === item.product_id}
                        />
                        <EditablePriceCell
                          value={item.selling_price}
                          productId={item.product_id}
                          field="selling_price"
                          onSave={handleSavePrice}
                          saving={savingId === item.product_id}
                        />
                        <TableCell className="text-right font-mono text-sm text-muted-foreground max-sm:hidden">₹{item.landed_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400 max-sm:hidden">
                          ₹{item.gross_profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <MarginBadge margin={item.gross_margin_pct} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm max-sm:hidden">{item.gmroi.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hml" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-200 dark:border-red-900/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <TrendingUp className="size-5" /> High Cost (&gt;₹500)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground">{hml.high}</div>
                <p className="text-sm text-muted-foreground mt-1">Products</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Minus className="size-5" /> Medium Cost (₹100–₹500)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground">{hml.medium}</div>
                <p className="text-sm text-muted-foreground mt-1">Products</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <TrendingDown className="size-5" /> Low Cost (&lt;₹100)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground">{hml.low}</div>
                <p className="text-sm text-muted-foreground mt-1">Products</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          {data && data.low_stock_alerts.length > 0 ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Reorder At</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.low_stock_alerts.map((alert) => (
                      <TableRow key={alert.product_id}>
                        <TableCell className="font-medium text-foreground">{alert.product_name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{alert.sku}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{alert.stock_quantity}</TableCell>
                        <TableCell className="text-right font-mono">{alert.reorder_threshold}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="size-3" /> Low Stock
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No low stock alerts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EditablePriceCell({
  value, productId, field, onSave, saving,
}: {
  value: number
  productId: number
  field: "cost_price" | "selling_price"
  onSave: (id: number, field: "cost_price" | "selling_price", newValue: string) => void
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))

  const handleSave = useCallback(() => {
    setEditing(false)
    if (editValue !== String(value)) {
      onSave(productId, field, editValue)
    }
  }, [editValue, value, onSave, productId, field])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") {
      setEditValue(String(value))
      setEditing(false)
    }
  }, [handleSave, value])

  if (editing) {
    return (
      <TableCell className="text-right">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-24 h-8 text-right text-sm font-mono"
        />
      </TableCell>
    )
  }

  return (
    <TableCell
      className="text-right font-mono cursor-pointer hover:bg-accent/50 transition-colors rounded"
      onClick={() => { setEditValue(String(value)); setEditing(true) }}
      title={`Click to edit ${field === "cost_price" ? "cost price" : "selling price"}`}
    >
      {saving ? (
        <span className="text-muted-foreground text-xs">saving...</span>
      ) : (
        <span>₹{value.toFixed(2)}</span>
      )}
    </TableCell>
  )
}
