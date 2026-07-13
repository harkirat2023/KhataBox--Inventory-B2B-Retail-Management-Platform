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

interface DashboardData {
  total_products: number
  low_stock_count: number
  out_of_stock_count: number
  total_revenue_today: number
  total_revenue_this_month: number
  total_revenue_this_year: number
  total_orders_today: number
  total_orders_this_month: number
  total_orders_this_year: number
  sales_chart: { month: string; revenue: number; orders: number }[]
}

interface TopCustomer {
  id: number
  company_name: string
  email: string
  credit_limit: number
  credit_used: number
  total_spent: number
  order_count: number
}

interface RepeatCustomer {
  id: number
  company_name: string
  email: string
  order_count: number
  total_spent: number
}

interface CLVCustomer {
  id: number
  company_name: string
  email: string
  lifetime_value: number
  order_count: number
  avg_order_value: number
  last_order_date: string | null
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--destructive))"]

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [repeatCustomers, setRepeatCustomers] = useState<RepeatCustomer[]>([])
  const [clvCustomers, setCLVCustomers] = useState<CLVCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(false)
  const { activeStore } = useStoreContext()

  useEffect(() => {
    setLoading(true)
    const url = activeStore?.id ? `/api/v1/dashboard/?store_id=${activeStore.id}` : "/api/v1/dashboard/"
    clientApi.get<DashboardData>(url)
      .then(setDashboard)
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }, [activeStore])

  const salesSummaryData = useMemo(() => dashboard ? [
    { label: "Today", value: `₹${(dashboard.total_revenue_today || 0).toLocaleString()}`, change: `${dashboard.total_orders_today || 0} orders`, icon: DollarSign },
    { label: "Monthly", value: `₹${(dashboard.total_revenue_this_month || 0).toLocaleString()}`, change: `${dashboard.total_orders_this_month || 0} orders`, icon: TrendingUp },
    { label: "Yearly", value: `₹${(dashboard.total_revenue_this_year || 0).toLocaleString()}`, change: `${dashboard.total_orders_this_year || 0} orders`, icon: ShoppingCart },
    { label: "Products", value: `${dashboard.total_products || 0}`, change: `${dashboard.low_stock_count} low stock`, icon: Package },
  ] : [], [dashboard])

  const rawInventory = useMemo(() => dashboard ? [
    { name: "In Stock", value: Math.max(0, (dashboard.total_products || 0) - (dashboard.low_stock_count || 0) - (dashboard.out_of_stock_count || 0)) },
    { name: "Low Stock", value: dashboard.low_stock_count || 0 },
    { name: "Out of Stock", value: dashboard.out_of_stock_count || 0 },
  ] : [], [dashboard])

  const inventoryChartData = useMemo(() => rawInventory.filter(d => d.value > 0), [rawInventory])

  const salesChartData = useMemo(() => (dashboard?.sales_chart?.length ? dashboard.sales_chart : []), [dashboard])

  const productsChartData = useMemo(() => (dashboard?.sales_chart?.length ? dashboard.sales_chart.map(d => ({ category: d.month, count: d.orders })) : []), [dashboard])

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-sm ">
          View and analyze your business performance.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {activeStore?.id && (
          <div className="flex items-center gap-1 text-xs  bg-muted px-3 py-1.5 rounded-full w-fit">
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
          <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground ">Sales</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground ">Inventory</TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground ">Products</TabsTrigger>
          <TabsTrigger value="customers" onClick={loadCustomerReports} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground ">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 pt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-3">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <Skeleton className="h-8 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {salesSummaryData.map((item) => {
                  const Icon = item.icon
                  return (
                    <Card key={item.label} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                      <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                        <CardTitle className="text-sm font-medium text-foreground/80">{item.label}</CardTitle>
                        <Icon className="size-4 " />
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="text-2xl font-bold text-foreground">{item.value}</div>
                        <p className="mt-1 text-xs text-emerald-600">{item.change}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <CardHeader className="p-0 pb-5">
                  <CardTitle className="text-base font-semibold text-foreground">Revenue & Orders Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {salesChartData.length === 0 ? (
                    <div className="text-center py-16 text-sm ">No revenue data available yet</div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height={300} minWidth={300}>
                        <BarChart data={salesChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="month"
                            className="text-xs "
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            className="text-xs "
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid hsl(var(--border))",
                              fontSize: "13px",
                            }}
                          />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6 pt-4">
          <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-foreground">Stock Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : inventoryChartData.length === 0 ? (
                <div className="text-center py-16 text-sm ">No inventory data available</div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height={300} minWidth={300}>
                    <PieChart>
                      <Pie
                        data={inventoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label
                      >
                        {inventoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "13px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6 pt-4">
          <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-foreground">Products by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : productsChartData.length === 0 ? (
                <div className="text-center py-16 text-sm ">No product data available</div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height={300} minWidth={300}>
                    <BarChart data={productsChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs " tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="category"
                        type="category"
                        className="text-xs "
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "13px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6 pt-4">
          {customersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => (
                <Card key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardHeader className="p-0 pb-3">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    {[1,2,3,4].map((j) => (
                      <Skeleton key={j} className="h-8 w-full" />
                    ))}
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
                      <TableHead className="">Company</TableHead>
                      <TableHead className="text-right ">Orders</TableHead>
                      <TableHead className="text-right ">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center  py-8">No data available</TableCell></TableRow>
                    ) : (
                      topCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-foreground/80">{c.company_name}</TableCell>
                          <TableCell className="text-right text-sm ">{c.order_count}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">₹{(c.total_spent).toFixed(2)}</TableCell>
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
                      <TableHead className="">Company</TableHead>
                      <TableHead className="text-right ">Orders</TableHead>
                      <TableHead className="text-right ">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center  py-8">No data available</TableCell></TableRow>
                    ) : (
                      repeatCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-foreground/80">{c.company_name}</TableCell>
                          <TableCell className="text-right text-sm ">{c.order_count}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">₹{(c.total_spent).toFixed(2)}</TableCell>
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
                      <TableHead className="">Company</TableHead>
                      <TableHead className="text-right ">CLV</TableHead>
                      <TableHead className="text-right ">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clvCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center  py-8">No data available</TableCell></TableRow>
                    ) : (
                      clvCustomers.slice(0, 10).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-foreground/80">{c.company_name}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">₹{(c.lifetime_value).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm ">₹{c.avg_order_value.toFixed(2)}</TableCell>
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
