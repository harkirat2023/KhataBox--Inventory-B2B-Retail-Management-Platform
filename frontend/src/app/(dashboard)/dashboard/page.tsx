"use client"

import { useEffect, useState } from "react"
import { Package, ShoppingCart, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, Boxes } from "lucide-react"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"
import { useUser } from "@/hooks/use-user"

interface DashboardStats {
  total_products: number
  total_customers: number
  total_orders: number
  total_revenue: number
  low_stock_count: number
  pending_order_count: number
  recent_orders: Array<{
    id: number
    total: number
    status: string
    created_at: string
  }>
  revenue_change: number
  orders_change: number
}

const defaultStats: DashboardStats = {
  total_products: 0,
  total_customers: 0,
  total_orders: 0,
  total_revenue: 0,
  low_stock_count: 0,
  pending_order_count: 0,
  recent_orders: [],
  revenue_change: 0,
  orders_change: 0,
}

function StatCard({
  label,
  value,
  icon: Icon,
  change,
  format = "number",
}: {
  label: string
  value: number | string
  icon: React.ElementType
  change?: number
  format?: "number" | "currency"
}) {
  const formattedValue =
    format === "currency"
      ? `₹${Number(value).toLocaleString("en-IN")}`
      : Number(value).toLocaleString("en-IN")

  const isUp = change !== undefined && change >= 0
  const ChangeIcon = isUp ? ArrowUpRight : ArrowDownRight

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-center justify-center size-8 rounded-[4px] bg-amber-brand/10 shrink-0">
          <Icon className="size-4 text-amber-brand" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
          {formattedValue}
        </span>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${
            isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            <ChangeIcon className="size-3" />
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-[3px] ${map[status.toLowerCase()] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
      {status}
    </span>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const { activeStore } = useStoreContext()
  const { user } = useUser()

  useEffect(() => {
    if (!activeStore.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    clientApi
      .get<DashboardStats>(`/api/v1/dashboard/stats?store_id=${activeStore.id}`)
      .then(setStats)
      .catch(() => setStats(defaultStats))
      .finally(() => setLoading(false))
  }, [activeStore.id])

  const displayName = activeStore?.name || user?.store_name || "Dashboard"
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{displayName}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{today}</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="size-2 rounded-full bg-amber-brand animate-pulse" />
              Syncing...
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Revenue"
            value={stats.total_revenue}
            icon={DollarSign}
            change={stats.revenue_change}
            format="currency"
          />
          <StatCard
            label="Total Orders"
            value={stats.total_orders}
            icon={ShoppingCart}
            change={stats.orders_change}
          />
          <StatCard
            label="Products"
            value={stats.total_products}
            icon={Package}
          />
          <StatCard
            label="Customers"
            value={stats.total_customers}
            icon={Users}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Alert */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Boxes className="size-4 text-amber-brand" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Low Stock Alert</h2>
            </div>
            {stats.low_stock_count > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-red-600 dark:text-red-400 font-mono">{stats.low_stock_count}</span>
                <span className="text-sm text-zinc-500">products need reorder</span>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">All products adequately stocked.</p>
            )}
          </div>

          {/* Pending Orders */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="size-4 text-amber-brand" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pending Orders</h2>
            </div>
            {stats.pending_order_count > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono">{stats.pending_order_count}</span>
                <span className="text-sm text-zinc-500">orders to fulfill</span>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No pending orders.</p>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Orders</h2>
            {stats.recent_orders.length === 0 ? (
              <p className="text-sm text-zinc-400">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.recent_orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-zinc-900 dark:text-zinc-100">#{order.id}</span>
                      <span className="text-xs text-zinc-500 ml-2">₹{Number(order.total).toLocaleString("en-IN")}</span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
