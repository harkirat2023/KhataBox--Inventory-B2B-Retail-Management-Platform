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
  ArrowRight,
  ClipboardList,
  IndianRupee,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronRight,
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
import { Progress } from "@/components/ui/progress"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"
import { queryKeys } from "@/lib/query-keys"
import { useQuery } from "@tanstack/react-query"
import { Product } from "@/types/product"
import { Order } from "@/types/order"
import { cn } from "@/lib/utils"

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
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
}

const quickActions = [
  { label: "Create Product", href: "/inventory", icon: Plus, query: "add", color: "text-blue-600 bg-blue-50 dark:bg-blue-950" },
  { label: "Generate Bill", href: "/billing", icon: Receipt, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950" },
  { label: "Purchase Order", href: "/purchase-orders", icon: Truck, query: "new", color: "text-purple-600 bg-purple-50 dark:bg-purple-950" },
  { label: "Scan Inventory", href: "/inventory/scan", icon: Camera, color: "text-orange-600 bg-orange-50 dark:bg-orange-950" },
  { label: "View Orders", href: "/orders", icon: ShoppingCart, color: "text-rose-600 bg-rose-50 dark:bg-rose-950" },
]

function MetricSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center size-12 rounded-xl bg-muted mb-4">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button variant="outline" size="sm" className="mt-4 rounded-lg">
            {action.label}
            <ArrowRight className="size-3 ml-1.5" />
          </Button>
        </Link>
      )}
    </div>
  )
}

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
      icon: IndianRupee,
      value: stats ? `₹${stats.total_inventory_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null,
      change: stats && stats.total_inventory_value > 0 ? "Current value" : "No inventory",
      changePositive: stats ? stats.total_inventory_value > 0 : true,
      metricStyle: "default",
    },
    {
      title: "Today's Sales",
      icon: TrendingUp,
      value: stats ? `₹${stats.today_sales_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null,
      subtitle: stats ? `${stats.today_sales_count} orders` : null,
      change: stats && stats.today_sales_count > 0 ? "Today's revenue" : "No sales yet",
      changePositive: stats ? stats.today_sales_count > 0 : true,
      metricStyle: "success",
    },
    {
      title: "Pending Orders",
      icon: ShoppingCart,
      value: stats ? `${stats.pending_orders_count}` : null,
      change: stats && stats.pending_orders_count > 0 ? "Requires attention" : "All cleared",
      changePositive: stats ? stats.pending_orders_count === 0 : true,
      metricStyle: "warning",
    },
    {
      title: "Low Stock Products",
      icon: AlertTriangle,
      value: stats ? `${stats.low_stock_count}` : null,
      change: stats && stats.low_stock_count > 0 ? "Reorder needed" : "Well stocked",
      changePositive: stats ? stats.low_stock_count === 0 : true,
      metricStyle: "danger",
    },
  ]

  const metricBgMap: Record<string, string> = {
    default: "bg-gradient-to-br from-primary/5 to-transparent",
    success: "bg-gradient-to-br from-green-500/5 to-transparent",
    warning: "bg-gradient-to-br from-amber-500/5 to-transparent",
    danger: "bg-gradient-to-br from-red-500/5 to-transparent",
  }

  const iconBgMap: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    danger: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your business at a glance</p>
        </div>
        {stores && stores.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Store:</label>
            <Select
              value={activeStore.id ? String(activeStore.id) : ""}
              onValueChange={(val) => {
                const store = stores.find((s) => String(s.id) === val)
                setActiveStore(store ? { id: store.id, name: store.name } : { id: null, name: null })
              }}
            >
              <SelectTrigger className="w-[180px] h-9 rounded-lg">
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
              <Button
                variant="ghost"
                className="w-full h-auto py-3.5 flex-col gap-2 bg-card border hover:bg-muted/50 rounded-xl shadow-sm transition-all hover:shadow-md"
              >
                <div className={cn("flex items-center justify-center size-9 rounded-lg", action.color)}>
                  <Icon className="size-4" />
                </div>
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
          const bgStyle = metricBgMap[card.metricStyle]
          const iconStyle = iconBgMap[card.metricStyle]
          return (
            <Card
              key={card.title}
              className={cn(
                "relative overflow-hidden border shadow-sm transition-all hover:shadow-md",
                bgStyle
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={cn("flex items-center justify-center size-8 rounded-lg", iconStyle)}>
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {statsLoading ? (
                  <MetricSkeleton />
                ) : (
                  <>
                    <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5">
                      {card.changePositive ? (
                        <ArrowUpRight className="size-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="size-3 text-amber-500" />
                      )}
                      <p className={cn(
                        "text-xs",
                        card.changePositive ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {card.change}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts & Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-lg gap-1">
                View All <ChevronRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No recent orders"
                description="Orders placed today will appear here."
                action={{ label: "Create Order", href: "/billing" }}
              />
            ) : (
              <div className="space-y-1">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders?id=${order.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-all duration-150 border border-transparent hover:border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
                          <ShoppingCart className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_name || "Walk-in"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className={cn("text-xs font-normal", statusStyles[order.status])}>
                          {order.status}
                        </Badge>
                        <span className="text-sm font-medium tabular-nums">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <CardTitle className="text-base font-semibold">Low Stock Alert</CardTitle>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-lg gap-1">
                View All <ChevronRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {lowStockProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title="All stocked up"
                description="All products are above their reorder thresholds."
              />
            ) : (
              <div className="space-y-1">
                {lowStockProducts.map((product) => (
                  <Link key={product.id} href={`/inventory?product=${product.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-all duration-150 border border-transparent hover:border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-red-50 dark:bg-red-950 shrink-0">
                          <Package className="size-4 text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{product.stock_quantity}</p>
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
