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

  const loadCustomerReports = useCallback(async () => {
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
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">
          View and analyze your business performance.
        </p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers" onClick={loadCustomerReports}>Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {salesSummaryData.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <p className="mt-1 text-xs text-emerald-600">{item.change}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue & Orders Overview</CardTitle>
            </CardHeader>
            <CardContent>
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
          <Card>
            <CardHeader>
              <CardTitle>Stock Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
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
          <Card>
            <CardHeader>
              <CardTitle>Products by Category</CardTitle>
            </CardHeader>
            <CardContent>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Top Customers</CardTitle>
                <Star className="size-4 text-yellow-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{c.company_name}</TableCell>
                        <TableCell className="text-right text-sm">{c.order_count}</TableCell>
                        <TableCell className="text-right font-medium">₹{(c.total_spent).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {topCustomers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Repeat Purchases</CardTitle>
                <Repeat className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatCustomers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{c.company_name}</TableCell>
                        <TableCell className="text-right text-sm">{c.order_count}</TableCell>
                        <TableCell className="text-right font-medium">₹{(c.total_spent).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {repeatCustomers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
                <Wallet className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">CLV</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clvCustomers.slice(0, 10).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{c.company_name}</TableCell>
                        <TableCell className="text-right font-medium">₹{(c.lifetime_value).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">₹{c.avg_order_value.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {clvCustomers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
