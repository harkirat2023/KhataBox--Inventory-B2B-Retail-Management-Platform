"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  Star,
  Repeat,
  Wallet,
  Store,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  IndianRupee,
  Percent,
  BarChart3,
  RefreshCw,
  Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useStoreContext } from "@/lib/store-context"
import { Order } from "@/types/order"
import { Product } from "@/types/product"

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--destructive))", "#22c55e", "#a855f7", "#f97316", "#06b6d4", "#ec4899"]

interface TopCustomer {
  id: number; company_name: string; email: string; credit_limit: number; credit_used: number; total_spent: number; order_count: number
}
interface RepeatCustomer {
  id: number; company_name: string; email: string; order_count: number; total_spent: number
}
interface CLVCustomer {
  id: number; company_name: string; email: string; lifetime_value: number; order_count: number; avg_order_value: number; last_order_date: string | null
}
interface ProfitItem {
  product_id: number; product_name: string; sku: string; cost_price: number; selling_price: number; landed_cost: number; gross_profit: number; gross_margin_pct: number; gmroi: number; revenue_projection: number; total_profit: number; stock_quantity: number
}

const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const formatCurrencyExact = (v: number) => `₹${v.toFixed(2)}`
const formatPercent = (v: number) => `${v.toFixed(1)}%`

function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <CardHeader className="p-0 pb-3"><Skeleton className="h-4 w-20" /></CardHeader>
          <CardContent className="p-0"><Skeleton className="h-8 w-28" /></CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingChart() {
  return <Skeleton className="h-[300px] w-full rounded-xl" />
}

function EmptyChart({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center">
      <div className="flex items-center justify-center size-12 rounded-2xl bg-muted mb-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-destructive mb-3">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
        <RefreshCw className="size-3.5 mr-1.5" /> Retry
      </Button>
    </div>
  )
}

export default function ReportsPage() {
  const { activeStore } = useStoreContext()

  // -- Sales state
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  // -- Inventory state
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  // -- Net Profit state
  const [profitData, setProfitData] = useState<ProfitItem[]>([])
  const [profitLoading, setProfitLoading] = useState(true)
  const [profitError, setProfitError] = useState<string | null>(null)

  // -- Customer state
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [repeatCustomers, setRepeatCustomers] = useState<RepeatCustomer[]>([])
  const [clvCustomers, setCLVCustomers] = useState<CLVCustomer[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const data = await clientApi.get<Order[]>("/api/v1/orders/")
      setOrders(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load orders"
      setOrdersError(msg)
      toast.error(msg)
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const data = await clientApi.get<Product[]>("/api/v1/products/")
      setProducts(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load products"
      setProductsError(msg)
      toast.error(msg)
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const loadProfitData = useCallback(async () => {
    setProfitLoading(true)
    setProfitError(null)
    try {
      const data = await clientApi.get<{ profitability: ProfitItem[] }>("/api/v1/price-analysis/overview")
      setProfitData(data.profitability || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load profit data"
      setProfitError(msg)
      toast.error(msg)
    } finally {
      setProfitLoading(false)
    }
  }, [])

  const loadCustomerReports = useCallback(async () => {
    setCustomersLoading(true)
    try {
      const [top, repeat, clv] = await Promise.all([
        clientApi.get<TopCustomer[]>("/api/v1/reports/customers/top?limit=10"),
        clientApi.get<RepeatCustomer[]>("/api/v1/reports/customers/repeat-purchases?limit=10"),
        clientApi.get<CLVCustomer[]>("/api/v1/reports/customers/clv?min_orders=1"),
      ])
      setTopCustomers(top)
      setRepeatCustomers(repeat)
      setCLVCustomers(clv)
    } catch { toast.error("Failed to load customer reports") }
    finally { setCustomersLoading(false) }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])
  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadProfitData() }, [loadProfitData])

  // ============ SALES COMPUTATIONS ============
  const salesSummary = useMemo(() => {
    if (!orders.length) return null
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
    const totalOrders = orders.length
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
    const todayRev = todayOrders.reduce((s, o) => s + o.total, 0)
    const thisMonth = orders.filter(o => {
      const d = new Date(o.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const monthRev = thisMonth.reduce((s, o) => s + o.total, 0)
    const completed = orders.filter(o => o.status === "completed")
    const avgOrder = completed.length > 0 ? completed.reduce((s, o) => s + o.total, 0) / completed.length : 0
    return { totalRevenue, totalOrders, todayRev, todayCount: todayOrders.length, monthRev, monthCount: thisMonth.length, avgOrder }
  }, [orders])

  const revenueTrend = useMemo(() => {
    if (!orders.length) return []
    const map: Record<string, { revenue: number; orders: number }> = {}
    for (const o of orders) {
      if (o.status !== "completed") continue
      const key = new Date(o.created_at).toISOString().slice(0, 7)
      if (!map[key]) map[key] = { revenue: 0, orders: 0 }
      map[key].revenue += o.total
      map[key].orders += 1
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }))
  }, [orders])

  const orderStatusDist = useMemo(() => {
    if (!orders.length) return []
    const map: Record<string, number> = {}
    for (const o of orders) {
      const status = o.status || "unknown"
      map[status] = (map[status] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [orders])

  const dailySales = useMemo(() => {
    if (!orders.length) return []
    const map: Record<string, number> = {}
    for (const o of orders) {
      if (o.status !== "completed") continue
      const key = new Date(o.created_at).toISOString().slice(0, 10)
      map[key] = (map[key] || 0) + o.total
    }
    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    return entries.slice(-30).map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))
  }, [orders])

  // ============ INVENTORY COMPUTATIONS ============
  const stockDistribution = useMemo(() => {
    if (!products.length) return []
    const inStock = products.filter(p => p.stock_quantity > p.reorder_threshold).length
    const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_threshold).length
    const outOfStock = products.filter(p => p.stock_quantity === 0).length
    return [
      { name: "In Stock", value: inStock },
      { name: "Low Stock", value: lowStock },
      { name: "Out of Stock", value: outOfStock },
    ].filter(d => d.value > 0)
  }, [products])

  const inventoryValue = useMemo(() => {
    return products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0)
  }, [products])

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_threshold).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 10)
  }, [products])

  const topStocked = useMemo(() => {
    return [...products].sort((a, b) => b.stock_quantity - a.stock_quantity).slice(0, 10)
  }, [products])

  const nearThreshold = useMemo(() => {
    return products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_threshold * 1.2).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 10)
  }, [products])

  // ============ PROFIT COMPUTATIONS ============
  const profitSummary = useMemo(() => {
    if (!profitData.length) return null
    const totalProfit = profitData.reduce((s, p) => s + p.total_profit, 0)
    const avgMargin = profitData.reduce((s, p) => s + p.gross_margin_pct, 0) / profitData.length
    const topProfitable = [...profitData].sort((a, b) => b.total_profit - a.total_profit).slice(0, 5)
    const leastProfitable = [...profitData].sort((a, b) => a.total_profit - b.total_profit).slice(0, 5)
    return { totalProfit, avgMargin, topProfitable, leastProfitable, count: profitData.length }
  }, [profitData])

  const profitDistribution = useMemo(() => {
    if (!profitData.length) return []
    const high = profitData.filter(p => p.gross_margin_pct >= 30).length
    const medium = profitData.filter(p => p.gross_margin_pct >= 15 && p.gross_margin_pct < 30).length
    const low = profitData.filter(p => p.gross_margin_pct < 15).length
    return [
      { name: "High (≥30%)", value: high },
      { name: "Medium (15-30%)", value: medium },
      { name: "Low (<15%)", value: low },
    ].filter(d => d.value > 0)
  }, [profitData])

  const exportReport = useCallback(async (entity: string, format: string) => {
    try {
      const url = `/api/v1/reports/export/${entity}?format=${format}`
      const response = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } })
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${entity}_export.${format}`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success(`${entity} exported as ${format.toUpperCase()}`)
    } catch { toast.error("Export failed") }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">View and analyze your business performance.</p>
      </div>

      <div className="flex items-center gap-2">
        {activeStore?.id && (
          <div className="flex items-center gap-1 text-xs bg-muted px-3 py-1.5 rounded-full w-fit">
            <Store className="size-3" />
            {activeStore.name}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-accent px-3 py-1.5 text-sm font-medium outline-none transition-colors">
            <Download className="size-3.5" /> Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl border-border bg-card p-1">
            <DropdownMenuItem onClick={() => exportReport("orders", "csv")} className="rounded-lg cursor-pointer gap-2">
              <FileSpreadsheet className="size-4" /> Orders CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportReport("orders", "xlsx")} className="rounded-lg cursor-pointer gap-2">
              <FileText className="size-4" /> Orders XLSX
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportReport("products", "csv")} className="rounded-lg cursor-pointer gap-2">
              <FileSpreadsheet className="size-4" /> Products CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportReport("products", "xlsx")} className="rounded-lg cursor-pointer gap-2">
              <FileText className="size-4" /> Products XLSX
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportReport("customers", "csv")} className="rounded-lg cursor-pointer gap-2">
              <FileSpreadsheet className="size-4" /> Customers CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportReport("suppliers", "csv")} className="rounded-lg cursor-pointer gap-2">
              <FileSpreadsheet className="size-4" /> Suppliers CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="rounded-xl bg-muted p-1">
          <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground">Sales</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground">Inventory</TabsTrigger>
          <TabsTrigger value="net-profit" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground">Net Profit</TabsTrigger>
          <TabsTrigger value="customers" onClick={loadCustomerReports} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground">Customers</TabsTrigger>
        </TabsList>

        {/* ========== SALES TAB ========== */}
        <TabsContent value="sales" className="space-y-6 pt-4">
          {ordersLoading ? (
            <>
              <LoadingCards count={4} />
              <LoadingChart />
            </>
          ) : ordersError ? (
            <ErrorState message={ordersError} onRetry={loadOrders} />
          ) : !orders.length ? (
            <EmptyChart icon={ShoppingCart} title="No orders found" description="Start creating orders to see sales reports." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Total Revenue</CardTitle>
                    <DollarSign className="size-4 text-primary" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(salesSummary?.totalRevenue || 0)}</div>
                    <p className="mt-1 text-xs text-emerald-600">{salesSummary?.totalOrders} total orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Today</CardTitle>
                    <TrendingUp className="size-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(salesSummary?.todayRev || 0)}</div>
                    <p className="mt-1 text-xs text-emerald-600">{salesSummary?.todayCount} orders today</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">This Month</CardTitle>
                    <BarChart3 className="size-4 text-blue-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(salesSummary?.monthRev || 0)}</div>
                    <p className="mt-1 text-xs text-emerald-600">{salesSummary?.monthCount} orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Avg Order Value</CardTitle>
                    <IndianRupee className="size-4 text-violet-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatCurrencyExact(salesSummary?.avgOrder || 0)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Per completed order</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-5">
                    <CardTitle className="text-base font-semibold text-foreground">Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {revenueTrend.length === 0 ? (
                      <EmptyChart icon={TrendingUp} title="No revenue data" description="Complete orders to see trends." />
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={revenueTrend}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                            <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              formatter={(value: unknown) => [formatCurrency(Number(value)), "Revenue"]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }}
                            />
                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-5">
                    <CardTitle className="text-base font-semibold text-foreground">Order Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {orderStatusDist.length === 0 ? (
                      <EmptyChart icon={Layers} title="No order data" description="Orders will appear here." />
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={orderStatusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                              {orderStatusDist.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: unknown) => [Number(value), "Orders"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <CardHeader className="p-0 pb-5">
                  <CardTitle className="text-base font-semibold text-foreground">Daily Sales (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {dailySales.length === 0 ? (
                    <EmptyChart icon={TrendingUp} title="No daily sales" description="Sales data will populate as orders are completed." />
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailySales}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: unknown) => [formatCurrency(Number(value)), "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }} />
                          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== INVENTORY TAB ========== */}
        <TabsContent value="inventory" className="space-y-6 pt-4">
          {productsLoading ? (
            <>
              <LoadingCards count={3} />
              <LoadingChart />
            </>
          ) : productsError ? (
            <ErrorState message={productsError} onRetry={loadProducts} />
          ) : !products.length ? (
            <EmptyChart icon={Package} title="No products found" description="Add products to track inventory." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Total Products</CardTitle>
                    <Package className="size-4 text-primary" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{products.length}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Active products tracked</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Inventory Value</CardTitle>
                    <IndianRupee className="size-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(inventoryValue)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">At cost price</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Low Stock Items</CardTitle>
                    <AlertTriangle className="size-4 text-amber-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{lowStockProducts.length}</div>
                    <p className="mt-1 text-xs text-amber-600">Below reorder threshold</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-5">
                    <CardTitle className="text-base font-semibold text-foreground">Stock Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {stockDistribution.length === 0 ? (
                      <EmptyChart icon={Package} title="No stock data" description="Products will appear here." />
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={stockDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                              {stockDistribution.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-5">
                    <CardTitle className="text-base font-semibold text-foreground">Top Stocked Products</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {topStocked.length === 0 ? (
                      <EmptyChart icon={Package} title="No product data" description="Add products to see stock levels." />
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={topStocked} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="name" type="category" className="text-xs" tick={{ fontSize: 10 }} width={120} />
                            <Tooltip formatter={(value: unknown) => [Number(value), "Stock"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }} />
                            <Bar dataKey="stock_quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">Low Stock & Near Threshold</CardTitle>
                  <Badge variant="outline" className="rounded-lg text-xs">{nearThreshold.length} products</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {nearThreshold.length === 0 ? (
                    <EmptyChart icon={Package} title="All well stocked" description="No products near their reorder threshold." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold text-foreground dark:text-white">Product</TableHead>
                          <TableHead className="font-bold text-foreground dark:text-white text-right">Stock</TableHead>
                          <TableHead className="font-bold text-foreground dark:text-white text-right">Threshold</TableHead>
                          <TableHead className="font-bold text-foreground dark:text-white text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nearThreshold.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm text-foreground/80">{p.name}</TableCell>
                            <TableCell className="text-right text-sm">{p.stock_quantity}</TableCell>
                            <TableCell className="text-right text-sm">{p.reorder_threshold}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={`text-xs rounded-lg ${p.stock_quantity === 0 ? "bg-red-600 hover:bg-red-700 text-white" : p.stock_quantity <= p.reorder_threshold ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}>
                                {p.stock_quantity === 0 ? "Out of Stock" : p.stock_quantity <= p.reorder_threshold ? "Low Stock" : "In Stock"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== NET PROFIT TAB ========== */}
        <TabsContent value="net-profit" className="space-y-6 pt-4">
          {profitLoading ? (
            <>
              <LoadingCards count={3} />
              <LoadingChart />
            </>
          ) : profitError ? (
            <ErrorState message={profitError} onRetry={loadProfitData} />
          ) : !profitData.length ? (
            <EmptyChart icon={IndianRupee} title="No profit data" description="Add products with cost and selling prices to analyze profitability." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Total Profit</CardTitle>
                    <IndianRupee className="size-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(profitSummary?.totalProfit || 0)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Across {profitSummary?.count || 0} products</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Avg Margin</CardTitle>
                    <Percent className="size-4 text-blue-500" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{formatPercent(profitSummary?.avgMargin || 0)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Gross margin average</p>
                  </CardContent>
                </Card>
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-foreground/80">Products Analyzed</CardTitle>
                    <Package className="size-4 text-primary" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-foreground">{profitSummary?.count || 0}</div>
                    <p className="mt-1 text-xs text-muted-foreground">With cost & price data</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-5">
                    <CardTitle className="text-base font-semibold text-foreground">Profit by Product</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={profitSummary?.topProfitable || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <YAxis dataKey="product_name" type="category" className="text-xs" tick={{ fontSize: 10 }} width={120} />
                          <Tooltip formatter={(value: unknown) => [formatCurrency(Number(value)), "Profit"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }} />
                          <Bar dataKey="total_profit" fill="#22c55e" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-5">
                    <CardTitle className="text-base font-semibold text-foreground">Profit Margin Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {profitDistribution.length === 0 ? (
                      <EmptyChart icon={Percent} title="No margin data" description="Set product prices to see margin distribution." />
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={profitDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                              {profitDistribution.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "13px", background: "hsl(var(--card))" }} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">Top Profitable Products</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-foreground dark:text-white">Product</TableHead>
                        <TableHead className="font-bold text-foreground dark:text-white text-right">Selling Price</TableHead>
                        <TableHead className="font-bold text-foreground dark:text-white text-right">Landed Cost</TableHead>
                        <TableHead className="font-bold text-foreground dark:text-white text-right">Profit</TableHead>
                        <TableHead className="font-bold text-foreground dark:text-white text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitSummary?.topProfitable.map((p) => (
                        <TableRow key={p.product_id}>
                          <TableCell className="text-sm text-foreground/80">{p.product_name}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(p.selling_price)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrencyExact(p.landed_cost)}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{formatCurrencyExact(p.gross_profit)}</TableCell>
                          <TableCell className="text-right text-sm">{formatPercent(p.gross_margin_pct)}</TableCell>
                        </TableRow>
                      ))}
                      {(!profitSummary?.topProfitable.length) && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No profit data available</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ========== CUSTOMERS TAB ========== */}
        <TabsContent value="customers" className="space-y-6 pt-4">
          {customersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => (
                <Card key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-3"><Skeleton className="h-4 w-32" /></CardHeader>
                  <CardContent className="p-0 space-y-2">
                    {[1,2,3,4].map((j) => <Skeleton key={j} className="h-8 w-full" />)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-foreground/80">Top Customers</CardTitle>
                <Star className="size-4 text-yellow-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground dark:text-white">Company</TableHead>
                      <TableHead className="font-bold text-foreground dark:text-white text-right">Orders</TableHead>
                      <TableHead className="font-bold text-foreground dark:text-white text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No data available</TableCell></TableRow>
                    ) : (
                      topCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-foreground/80">{c.company_name}</TableCell>
                          <TableCell className="text-right text-sm">{c.order_count}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">₹{c.total_spent.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-foreground/80">Repeat Purchases</CardTitle>
                <Repeat className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground dark:text-white">Company</TableHead>
                      <TableHead className="font-bold text-foreground dark:text-white text-right">Orders</TableHead>
                      <TableHead className="font-bold text-foreground dark:text-white text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No data available</TableCell></TableRow>
                    ) : (
                      repeatCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-foreground/80">{c.company_name}</TableCell>
                          <TableCell className="text-right text-sm">{c.order_count}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">₹{c.total_spent.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-foreground/80">Customer Lifetime Value</CardTitle>
                <Wallet className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground dark:text-white">Company</TableHead>
                      <TableHead className="font-bold text-foreground dark:text-white text-right">CLV</TableHead>
                      <TableHead className="font-bold text-foreground dark:text-white text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clvCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No data available</TableCell></TableRow>
                    ) : (
                      clvCustomers.slice(0, 10).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-foreground/80">{c.company_name}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">₹{c.lifetime_value.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">₹{c.avg_order_value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
