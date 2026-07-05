"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Truck,
  Camera,
  Plus,
  ScanBarcode,
  ArrowRight,
  ClipboardList,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"
import { queryKeys } from "@/lib/query-keys"
import { useQuery } from "@tanstack/react-query"
import { Product } from "@/types/product"
import { Order } from "@/types/order"

interface DashboardStats {
  total_products: number
  total_inventory_value: number
  today_sales_count: number
  today_sales_amount: number
  pending_orders_count: number
  low_stock_count: number
}

interface Store {
  id: number
  name: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
}

const quickActions = [
  { label: "Create Product", href: "/inventory", icon: Plus, query: "add" },
  { label: "Generate Bill", href: "/billing", icon: Receipt },
  { label: "Purchase Order", href: "/purchase-orders", icon: Truck, query: "new" },
  { label: "Scan Inventory", href: "/inventory/scan", icon: Camera },
  { label: "View Orders", href: "/orders", icon: ShoppingCart },
]

export default function DashboardPage() {
  const router = useRouter()
  const { activeStore, setActiveStore } = useStoreContext()

  const { data: stores } = useQuery({
    queryKey: queryKeys.dashboard.stores(),
    queryFn: () => clientApi.get<Store[]>("/api/v1/stores/"),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(activeStore.id),
    queryFn: () => {
      const params = activeStore.id ? `?store_id=${activeStore.id}` : ""
      return clientApi.get<DashboardStats>(`/api/v1/dashboard/stats${params}`)
    },
  })

  const { data: ordersData } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => clientApi.get<Order[]>("/api/v1/orders/"),
    select: (data) => data.slice(0, 5),
  })

  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => clientApi.get<Product[]>("/api/v1/products/"),
    select: (data) =>
      data
        .filter((p) => p.stock_quantity <= p.reorder_threshold)
        .slice(0, 5),
  })

  const recentOrders = ordersData ?? []
  const lowStockProducts = productsData ?? []

  const cards = [
    {
      title: "Total Inventory Value",
      icon: DollarSign,
      value: stats ? `₹${stats.total_inventory_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null,
      change: stats && stats.total_inventory_value > 0 ? "Current value" : "No inventory",
      changePositive: stats ? stats.total_inventory_value > 0 : true,
    },
    {
      title: "Today's Sales",
      icon: ShoppingCart,
      value: stats ? `${stats.today_sales_count} orders (₹${stats.today_sales_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})` : null,
      change: stats && stats.today_sales_count > 0 ? "Today's revenue" : "No sales yet",
      changePositive: stats ? stats.today_sales_count > 0 : true,
    },
    {
      title: "Pending Orders",
      icon: Package,
      value: stats ? `${stats.pending_orders_count} pending` : null,
      change: stats && stats.pending_orders_count > 0 ? "Requires attention" : "All cleared",
      changePositive: stats ? stats.pending_orders_count === 0 : true,
    },
    {
      title: "Low Stock Products",
      icon: AlertTriangle,
      value: stats ? `${stats.low_stock_count} products` : null,
      change: stats && stats.low_stock_count > 0 ? "Reorder needed" : "Well stocked",
      changePositive: stats ? stats.low_stock_count === 0 : true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Your business at a glance.</p>
        </div>
        {stores && stores.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Store:</label>
            <Select
              value={activeStore.id ? String(activeStore.id) : ""}
              onValueChange={(val) => {
                const store = stores.find((s) => String(s.id) === val)
                setActiveStore(store ? { id: store.id, name: store.name } : { id: null, name: null })
              }}
            >
              <SelectTrigger className="w-[180px] rounded-xl border-slate-200 h-11">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Stores</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={`${action.href}${action.query ? `?${action.query}` : ""}`}>
              <Button className="w-full h-auto py-4 flex-col gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">
                <Icon className="size-5 text-slate-500" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">{card.title}</CardTitle>
                <Icon className="size-4 text-slate-400" />
              </CardHeader>
              <CardContent className="p-0">
                {statsLoading ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                )}
                <p className={`mt-1 text-xs ${card.changePositive ? "text-emerald-600" : "text-amber-600"}`}>
                  {card.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Orders</CardTitle>
            <Link href="/orders">
              <Button className="text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl h-9 px-3">
                View All <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center size-10 rounded-xl bg-slate-100 mb-3">
                  <ClipboardList className="size-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No recent orders</p>
                <p className="text-sm text-slate-500 mt-1">Orders placed today will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders?id=${order.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                          <p className="text-xs text-slate-500">{order.customer_name || "Walk-in"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${statusStyles[order.status]}`}>
                          {order.status}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Low Stock Alert</CardTitle>
            <Link href="/inventory">
              <Button className="text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl h-9 px-3">
                View All <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center size-10 rounded-xl bg-slate-100 mb-3">
                  <Package className="size-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">All stocked up</p>
                <p className="text-sm text-slate-500 mt-1">All products are above their reorder thresholds.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <Link key={product.id} href={`/inventory?product=${product.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-200">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">{product.stock_quantity}</p>
                        <p className="text-xs text-slate-500">in stock</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
