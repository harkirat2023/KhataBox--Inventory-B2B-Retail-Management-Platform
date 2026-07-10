"use client"

import { motion } from "framer-motion"
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
}

interface Store {
  id: number
  name: string
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
      <div className="flex items-center justify-center size-12 rounded-[4px] bg-muted mb-4">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button variant="outline" size="sm" className="mt-4 rounded-[4px]">
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
  ]

  const iconBgMap: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }

  return (
    <motion.div
      className="space-y-6"
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
              <SelectTrigger className="w-[180px] h-9 rounded-[4px]">
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

      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" variants={itemVariants}>
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={`${action.href}${action.query ? `?${action.query}` : ""}`}>
              <motion.div
                whileHover={{ translateY: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto py-3.5 flex-col gap-2 hover:bg-accent rounded-[4px] transition-all"
                >
                  <div className={cn("flex items-center justify-center size-9 rounded-[4px]", action.color)}>
                    <Icon className="size-4" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                </Button>
              </motion.div>
            </Link>
          )
        })}
      </motion.div>

      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={itemVariants}>
        {cards.map((card) => {
          const Icon = card.icon
          const iconStyle = iconBgMap[card.metricStyle]
          return (
            <motion.div
              key={card.title}
              whileHover={{ translateY: -1 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
            >
              <Card className="relative">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={cn("flex items-center justify-center size-8 rounded-[4px]", iconStyle)}>
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {statsLoading ? (
                    <MetricSkeleton />
                  ) : (
                    <>
                      <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{card.value}</div>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{card.subtitle}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        {card.changePositive ? (
                          <ArrowUpRight className="size-3 text-success" />
                        ) : (
                          <ArrowDownRight className="size-3 text-warning" />
                        )}
                        <p className={cn(
                          "text-xs font-medium",
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
        <motion.div whileHover={{ translateY: -1 }} transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
              <CardTitle className="text-base font-semibold text-foreground">Recent Orders</CardTitle>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-[4px] gap-1">
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
                      <div className="flex items-center justify-between p-3 rounded-[4px] hover:bg-accent transition-all duration-150 border border-transparent hover:border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center size-8 rounded-[4px] bg-muted shrink-0">
                            <ShoppingCart className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_name || "Walk-in"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className={cn("text-xs font-normal", ORDER_STATUS_CONFIG[order.status]?.color)}>
                            {order.status}
                          </Badge>
                          <span className="text-sm font-medium tabular-nums text-foreground">₹{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ translateY: -1 }} transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
              <CardTitle className="text-base font-semibold text-foreground">Low Stock Alert</CardTitle>
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-[4px] gap-1">
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
                      <div className="flex items-center justify-between p-3 rounded-[4px] hover:bg-accent transition-all duration-150 border border-transparent hover:border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center size-8 rounded-[4px] bg-destructive/10 shrink-0">
                            <Package className="size-4 text-destructive" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-destructive tabular-nums">{product.stock_quantity}</p>
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
      </motion.div>
    </motion.div>
  )
}
