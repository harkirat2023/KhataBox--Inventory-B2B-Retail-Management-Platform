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
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Your business at a glance.</p>
        </div>
        {stores && stores.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Store:</label>
            <Select
              value={activeStore.id ? String(activeStore.id) : ""}
              onValueChange={(val) => {
                const store = stores.find((s) => String(s.id) === val)
                setActiveStore(store ? { id: store.id, name: store.name } : { id: null, name: null })
              }}
            >
              <SelectTrigger className="w-[180px]">
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
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-muted">
                <Icon className="size-5" />
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
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent orders</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders?id=${order.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_name || "Walk-in"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${statusStyles[order.status]}`}>
                          {order.status}
                        </Badge>
                        <span className="text-sm font-medium">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Low Stock Alert</CardTitle>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All products well stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <Link key={product.id} href={`/inventory?product=${product.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-destructive">{product.stock_quantity}</p>
                        <p className="text-xs text-muted-foreground">in stock</p>
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
