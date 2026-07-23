"use client"

import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Package,
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
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Store,
  X,
  Bell,
  Clock,
  RefreshCw,
  UserPlus,
  FileText,
  PlusCircle,
  Lightbulb,
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
import { ORDER_STATUS_CONFIG } from "@/lib/ui-constants"
import { cn } from "@/lib/utils"

interface DashboardStats {
  total_products: number
  total_inventory_value: number
  today_sales_count: number
  today_sales_amount: number
  pending_orders_count: number
  low_stock_count: number
  out_of_stock_count: number
  total_revenue_this_month: number
  total_revenue_this_year: number
  total_orders_this_month: number
  total_orders_this_year: number
  sales_chart: { month: string; revenue: number; orders: number }[]
  activity_feed: {
    type: string
    id: number
    title: string
    message: string
    icon?: string
    is_read?: boolean
    status?: string
    total?: number
    created_at: string
  }[]
}

interface Store {
  id: number
  name: string
  store_type: string | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ease: [0.16, 1, 0.3, 1] as [number, number, number, number], duration: 0.4 },
  },
}

const quickActions = [
  { label: "Create Product", href: "/inventory", icon: Plus, query: "add", color: "bg-primary/10 text-primary" },
  { label: "Generate Bill", href: "/billing", icon: Receipt, color: "bg-success/10 text-success" },
  { label: "Purchase Order", href: "/purchase-orders", icon: Truck, query: "new", color: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  { label: "Scan Inventory", href: "/inventory/scan", icon: Camera, color: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" },
  { label: "View Orders", href: "/orders", icon: ShoppingCart, color: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" },
  { label: "Our Suggestions", href: "/setup-inventory", icon: Lightbulb, query: "store_type", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
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
      <div className="flex items-center justify-center size-14 rounded-2xl bg-muted mb-4">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl">
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
  const [dismissB2cBanner, setDismissB2cBanner] = useState(false)

  const { data: stores } = useQuery({
    queryKey: queryKeys.dashboard.stores(),
    queryFn: () => clientApi.get<Store[]>("/api/v1/stores/"),
    refetchInterval: 60_000,
  })

  const activeStoreType = stores?.find(s => s.id === activeStore.id)?.store_type || "kirana"

  useEffect(() => {
    if (stores && stores.length > 0 && !activeStore.id) {
      setActiveStore({ id: stores[0].id, name: stores[0].name })
    }
  }, [stores, activeStore.id, setActiveStore])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(activeStore.id),
    queryFn: () => {
      const params = activeStore.id ? `?store_id=${activeStore.id}` : ""
      return clientApi.get<DashboardStats>(`/api/v1/dashboard/stats${params}`)
    },
    refetchInterval: 30_000,
    placeholderData: (previousData) => previousData,
  })

  const { data: ordersData } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => clientApi.get<Order[]>("/api/v1/orders/"),
    select: (data) => data.slice(0, 5),
    refetchInterval: 30_000,
  })

  const { data: productsData } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => clientApi.get<Product[]>("/api/v1/products/"),
    select: (data) =>
      data
        .filter((p) => p.stock_quantity <= p.reorder_threshold)
        .slice(0, 5),
    refetchInterval: 30_000,
  })

  const { data: pendingB2cOrders } = useQuery({
    queryKey: ['b2c', 'orders', 'pending'],
    queryFn: () => clientApi.get<Order[]>("/api/v1/b2c/shopkeeper/orders?status=pending"),
    refetchInterval: 30_000,
  })

  const recentOrders = ordersData ?? []
  const lowStockProducts = productsData ?? []
  const pendingB2cCount = pendingB2cOrders?.length ?? 0

  const cards = useMemo(() => [
    {
      title: "Inventory Value",
      icon: IndianRupee,
      value: stats ? `₹${stats.total_inventory_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null,
      subtitle: `${stats?.total_products ?? 0} products tracked`,
      change: stats && stats.total_inventory_value > 0 ? "Current value" : "No inventory",
      changePositive: stats ? stats.total_inventory_value > 0 : true,
      metricStyle: "default",
    },
    {
      title: "Today's Sales",
      icon: TrendingUp,
      value: stats ? `₹${stats.today_sales_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null,
      subtitle: stats ? `${stats.today_sales_count} orders fulfilled` : null,
      change: stats && stats.today_sales_count > 0 ? "Today's revenue" : "No sales yet",
      changePositive: stats ? stats.today_sales_count > 0 : true,
      metricStyle: "success",
    },
    {
      title: "Pending Orders",
      icon: ShoppingCart,
      value: stats ? `${stats.pending_orders_count}` : null,
      subtitle: "Awaiting fulfillment",
      change: stats && stats.pending_orders_count > 0 ? "Requires attention" : "All cleared",
      changePositive: stats ? stats.pending_orders_count === 0 : true,
      metricStyle: "warning",
    },
    {
      title: "Low Stock Items",
      icon: AlertTriangle,
      value: stats ? `${stats.low_stock_count}` : null,
      subtitle: "Below reorder threshold",
      change: stats && stats.low_stock_count > 0 ? "Reorder needed" : "Well stocked",
      changePositive: stats ? stats.low_stock_count === 0 : true,
      metricStyle: "danger",
    },
  ], [stats])

  const iconBgMap: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    danger: "bg-rose-100 text-rose-600",
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Warehouse operations summary</p>
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
              <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg">
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
      </motion.div>

      {/* Onboarding — first-time setup: visible until store has products */}
      {stats && stats.total_products === 0 && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Welcome! Your inventory is empty</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add products to start billing and tracking inventory.</p>
          </div>
          <Link href="/setup-inventory">
            <Button size="sm" className="rounded-xl whitespace-nowrap">
              <Package className="size-4 mr-1.5" />
              Setup Inventory
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Pending B2C Orders Banner */}
      {pendingB2cCount > 0 && !dismissB2cBanner && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center size-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 shrink-0">
              <Store className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {pendingB2cCount} B2C order{pendingB2cCount > 1 ? "s" : ""} pending approval
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Customers are waiting for you to review and confirm their orders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/orders?tab=b2c">
              <Button size="sm" className="rounded-xl whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                <ShoppingCart className="size-3.5 mr-1" />
                Review Orders
              </Button>
            </Link>
            <Button variant="ghost" size="icon-xs" className="size-8 text-amber-500 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xl" onClick={() => setDismissB2cBanner(true)}>
              <X className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" variants={itemVariants}>
        {quickActions.map((action) => {
          const Icon = action.icon
          const href = action.label === "Our Suggestions"
            ? `/setup-inventory?store_type=${activeStoreType}`
            : `${action.href}${action.query ? `?${action.query}` : ""}`
          return (
            <Link key={action.href} href={href}>
              <motion.div
                whileHover={{ translateY: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2.5 hover:bg-accent rounded-xl transition-all border-border shadow-sm hover:shadow-md"
                >
                  <div className={cn("flex items-center justify-center size-9 sm:size-10 rounded-xl", action.color)}>
                    <Icon className="size-4 sm:size-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-foreground leading-tight text-center">{action.label}</span>
                </Button>
              </motion.div>
            </Link>
          )
        })}
      </motion.div>

      <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" variants={itemVariants}>
        {cards.map((card) => {
          const Icon = card.icon
          const iconStyle = iconBgMap[card.metricStyle]
          return (
            <motion.div
              key={card.title}
              whileHover={{ translateY: -3 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
            >
              <Card className="relative">
                <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={cn("flex items-center justify-center size-9 rounded-xl", iconStyle)}>
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                  {statsLoading ? (
                    <MetricSkeleton />
                  ) : (
                    <>
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">{card.value}</div>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{card.subtitle}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-3">
                        {card.changePositive ? (
                          <ArrowUpRight className="size-3.5 text-success" />
                        ) : (
                          <ArrowDownRight className="size-3.5 text-warning" />
                        )}
                        <p className={cn(
                          "text-xs font-semibold",
                          card.changePositive ? "text-success" : "text-warning"
                        )}>
                          {card.change}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div className="grid gap-6 lg:grid-cols-2" variants={itemVariants}>
        <motion.div whileHover={{ translateY: -3 }} transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Recent Orders</CardTitle>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-xl gap-1">
                  View All <ChevronRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
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
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-all duration-200 border border-transparent hover:border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center size-9 rounded-xl bg-muted shrink-0">
                            <ShoppingCart className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_name || "Walk-in"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                          <Badge variant="outline" className={cn("text-[10px] sm:text-xs font-medium rounded-lg px-1.5 sm:px-2 py-0.5", ORDER_STATUS_CONFIG[order.status]?.color)}>
                            {order.status}
                          </Badge>
                          <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">₹{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ translateY: -3 }} transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Low Stock Alert</CardTitle>
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-xl gap-1">
                  View All <ChevronRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
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
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-all duration-200 border border-transparent hover:border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center size-9 rounded-xl bg-destructive/10 shrink-0">
                            <Package className="size-4 text-destructive" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-destructive tabular-nums">{product.stock_quantity}</p>
                          <p className="text-xs text-muted-foreground font-mono">in stock</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ translateY: -3 }} transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Activity Feed</CardTitle>
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-xl gap-1">
                  View All <ChevronRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
              {statsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : stats?.activity_feed && stats.activity_feed.length > 0 ? (
                <div className="space-y-1">
                  {stats.activity_feed.slice(0, 8).map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-all duration-200">
                      <div className={cn(
                        "flex items-center justify-center size-8 rounded-lg shrink-0",
                        item.type === "notification" ? (item.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary") : "bg-success/10 text-success"
                      )}>
                        {item.type === "notification" ? <Bell className="size-4" /> : <ShoppingCart className="size-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {item.total != null && <span className="hidden sm:inline text-sm font-semibold tabular-nums text-foreground">₹{item.total.toFixed(2)}</span>}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Bell} title="No recent activity" description="Activity from orders and notifications will appear here." />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
