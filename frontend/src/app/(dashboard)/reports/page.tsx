"use client"

import { useEffect, useState, useCallback } from "react"
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

const salesSummaryData = [
  { label: "Daily", value: "₹2,450", change: "+12%", icon: DollarSign },
  { label: "Weekly", value: "₹18,200", change: "+8%", icon: TrendingUp },
  { label: "Monthly", value: "₹72,500", change: "+15%", icon: ShoppingCart },
  { label: "Yearly", value: "₹8,45,000", change: "+22%", icon: Package },
]

const salesChartData = [
  { month: "Jan", revenue: 42000, orders: 180 },
  { month: "Feb", revenue: 38000, orders: 160 },
  { month: "Mar", revenue: 51000, orders: 210 },
  { month: "Apr", revenue: 46000, orders: 190 },
  { month: "May", revenue: 58000, orders: 240 },
  { month: "Jun", revenue: 53000, orders: 220 },
]

const inventoryChartData = [
  { name: "In Stock", value: 145 },
  { name: "Low Stock", value: 28 },
  { name: "Out of Stock", value: 12 },
]

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--destructive))"]

const productsChartData = [
  { category: "Electronics", count: 45 },
  { category: "Clothing", count: 32 },
  { category: "Food", count: 28 },
  { category: "Books", count: 18 },
  { category: "Other", count: 24 },
]

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

export default function ReportsPage() {
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [repeatCustomers, setRepeatCustomers] = useState<RepeatCustomer[]>([])
  const [clvCustomers, setCLVCustomers] = useState<CLVCustomer[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)

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
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          View and analyze your business performance.
        </p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Sales</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Inventory</TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Products</TabsTrigger>
          <TabsTrigger value="customers" onClick={loadCustomerReports} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {salesSummaryData.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                    <CardTitle className="text-sm font-medium text-slate-700">{item.label}</CardTitle>
                    <Icon className="size-4 text-slate-400" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                    <p className="mt-1 text-xs text-emerald-600">{item.change}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-slate-900">Revenue & Orders Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      className="text-xs text-muted-foreground"
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6 pt-4">
          <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-slate-900">Stock Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6 pt-4">
          <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-slate-900">Products by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                  <BarChart data={productsChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs text-muted-foreground" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      className="text-xs text-muted-foreground"
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6 pt-4">
          {customersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => (
                <Card key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
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
            <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">Top Customers</CardTitle>
                <Star className="size-4 text-yellow-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-500">Company</TableHead>
                      <TableHead className="text-right text-slate-500">Orders</TableHead>
                      <TableHead className="text-right text-slate-500">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-8">No data available</TableCell></TableRow>
                    ) : (
                      topCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-slate-700">{c.company_name}</TableCell>
                          <TableCell className="text-right text-sm text-slate-500">{c.order_count}</TableCell>
                          <TableCell className="text-right font-medium text-slate-900">₹{(c.total_spent).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">Repeat Purchases</CardTitle>
                <Repeat className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-500">Company</TableHead>
                      <TableHead className="text-right text-slate-500">Orders</TableHead>
                      <TableHead className="text-right text-slate-500">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-8">No data available</TableCell></TableRow>
                    ) : (
                      repeatCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-slate-700">{c.company_name}</TableCell>
                          <TableCell className="text-right text-sm text-slate-500">{c.order_count}</TableCell>
                          <TableCell className="text-right font-medium text-slate-900">₹{(c.total_spent).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">Customer Lifetime Value</CardTitle>
                <Wallet className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-500">Company</TableHead>
                      <TableHead className="text-right text-slate-500">CLV</TableHead>
                      <TableHead className="text-right text-slate-500">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clvCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-8">No data available</TableCell></TableRow>
                    ) : (
                      clvCustomers.slice(0, 10).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-slate-700">{c.company_name}</TableCell>
                          <TableCell className="text-right font-medium text-slate-900">₹{(c.lifetime_value).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm text-slate-500">₹{c.avg_order_value.toFixed(2)}</TableCell>
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
