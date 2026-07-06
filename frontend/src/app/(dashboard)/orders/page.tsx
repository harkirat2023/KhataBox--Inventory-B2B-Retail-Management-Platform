"use client"
import { useEffect, useState, useCallback, Fragment, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  Package,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Store,
  BadgePercent,
  MoreHorizontal,
  ChevronUp,
  ChevronsUpDown,
  ArrowUpDown,
  Filter,
  RefreshCw,
  FileText,
  ShoppingCart,
  Eye,
  Download,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Order, OrderStatus } from "@/types/order"
import { clientApi } from "@/lib/client-api"
import { cn } from "@/lib/utils"
import { ORDER_STATUS_CONFIG } from "@/lib/ui-constants"
import { STATUS_DOT_COLORS } from "@/lib/ui-constants"

type OrderTab = "all" | "regular" | "b2c"

type SortField = "order_number" | "customer_name" | "total" | "status" | "created_at"
type SortDir = "asc" | "desc" | null

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  counter: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
}

const statusTransitionMessages: Record<string, string> = {
  completed: "Are you sure you want to complete this order? Inventory will be deducted and receipt generated.",
  cancelled: "Are you sure you want to cancel this order?",
}

function OrderRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
    </TableRow>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [b2cOrders, setB2cOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<OrderTab>("b2c")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const [regularData, b2cPendingData] = await Promise.all([
        clientApi.get<Order[]>("/api/v1/orders/?b2c=false"),
        clientApi.get<Order[]>("/api/v1/b2c/shopkeeper/orders?status=pending"),
      ])
      setOrders(regularData)
      setB2cOrders(b2cPendingData)
    } catch (err) {
      console.error("Failed to load orders", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const getSortedFiltered = (items: Order[]) => {
    let filtered = items

    // Apply search
    if (search) {
      filtered = filtered.filter((o) =>
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name || "").toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter)
    }

    // Apply tab filter
    if (tab === "regular") {
      filtered = filtered.filter((o) => o.status !== "completed" && o.status !== "cancelled")
    } else if (tab === "b2c") {
      filtered = filtered.filter((o) => o.status === "pending" || o.status === "B2C-pending")
    }

    // Apply sort
    if (sortDir) {
      filtered.sort((a, b) => {
        let cmp = 0
        switch (sortField) {
          case "order_number":
            cmp = a.order_number.localeCompare(b.order_number)
            break
          case "customer_name":
            cmp = (a.customer_name || "").localeCompare(b.customer_name || "")
            break
          case "total":
            cmp = a.total - b.total
            break
          case "status":
            cmp = a.status.localeCompare(b.status)
            break
          case "created_at":
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            break
        }
        return sortDir === "asc" ? cmp : -cmp
      })
    }

    return filtered
  }

  const handleStatusOpenDialog = (order: Order, newStatus: OrderStatus) => {
    setSelectedOrder(order)
    setPendingStatus(newStatus)
    setDialogOpen(true)
  }

  const handleStatusConfirm = async () => {
    if (!selectedOrder || !pendingStatus) return
    setUpdating(true)
    try {
      await clientApi.patch(`/api/v1/orders/${selectedOrder.id}/status`, { status: pendingStatus })
      await loadOrders()
      setDialogOpen(false)
      const messages: Record<string, string> = {
        completed: "Order completed! Inventory deducted and receipt generated.",
        cancelled: "Order cancelled.",
      }
      toast.success(messages[pendingStatus] || "Status updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const handleApproveB2C = async (order: Order) => {
    setUpdating(true)
    try {
      await clientApi.post(`/api/v1/b2c/shopkeeper/orders/${order.id}/confirm`, {})
      await loadOrders()
      toast.success("B2C order approved & completed")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve/complete order")
    } finally {
      setUpdating(false)
    }
  }

  const handleRejectB2C = async (order: Order) => {
    setUpdating(true)
    try {
      await clientApi.post(`/api/v1/b2c/shopkeeper/orders/${order.id}/reject`, {})
      await loadOrders()
      toast.success("B2C order rejected")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject order")
    } finally {
      setUpdating(false)
    }
  }

  const currentOrders = tab === "b2c" ? b2cOrders : orders
  const filtered = getSortedFiltered(currentOrders)
  const activeRegularCount = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    if (sortDir === "asc") return <ChevronUp className="size-3 ml-0.5 inline" />
    if (sortDir === "desc") return <ChevronDown className="size-3 ml-0.5 inline" />
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track all orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
            className="rounded-lg gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-sm font-normal rounded-lg px-3 py-1">
            {tab === "b2c" ? `${b2cOrders.length} pending` : `${activeRegularCount} active`}
          </Badge>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setTab("regular")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              tab === "regular" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingCart className="size-4 inline mr-1.5" />
            Regular Orders
          </button>
          <button
            onClick={() => setTab("b2c")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              tab === "b2c" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Store className="size-4 inline mr-1.5" />
            B2C Orders
            {b2cOrders.length > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                {b2cOrders.length}
              </Badge>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-muted/50 border-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
            <SelectTrigger className="w-[130px] h-9 rounded-lg">
              <Filter className="size-3.5 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("order_number")}>
                  <div className="flex items-center gap-1">Order #{renderSortIcon("order_number")}</div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("customer_name")}>
                  <div className="flex items-center gap-1">Customer{renderSortIcon("customer_name")}</div>
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">Items</TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("total")}>
                  <div className="flex items-center gap-1">Total{renderSortIcon("total")}</div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">Status{renderSortIcon("status")}</div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1">Date{renderSortIcon("created_at")}</div>
                </TableHead>
                {tab === "b2c" && <TableHead className="text-muted-foreground font-medium">Action</TableHead>}
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tab === "b2c" ? 9 : 8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-center size-12 rounded-xl bg-muted mb-2">
                        <Package className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No orders found</p>
                      <p className="text-sm text-muted-foreground">
                        {tab === "b2c" ? "No pending B2C orders from customers." : "No active orders right now."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <Fragment key={order.id}>
                    <TableRow
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon-xs" className="size-6">
                          {expandedId === order.id ? (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.customer_name || <span className="italic text-muted-foreground/60">Walk-in</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {order.items?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        ₹{order.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("size-1.5 rounded-full", STATUS_DOT_COLORS[order.status] || "bg-muted")} />
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-normal px-2 py-0", statusStyles[order.status] || "")}
                          >
                            {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      {tab === "b2c" && (
                        <TableCell>
                          {order.status === "pending" || order.status === "B2C-pending" ? (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleApproveB2C(order)
                                }}
                                disabled={updating}
                                className="h-8 px-3 rounded-lg gap-1 text-xs"
                              >
                                <CheckCircle className="size-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRejectB2C(order)
                                }}
                                disabled={updating}
                                className="h-8 px-3 rounded-lg gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <XCircle className="size-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn("text-xs font-normal", statusStyles[order.status] || "")}
                            >
                              {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                          <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center justify-center size-7 rounded-md hover:bg-muted outline-none cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="size-3.5 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onSelect={() => router.push(`/orders?id=${order.id}`)}
                            >
                              <Eye className="size-3.5 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => router.push(`/billing?order=${order.id}`)}
                            >
                              <FileText className="size-3.5 mr-2" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tab === "regular" && order.status !== "completed" && order.status !== "cancelled" && (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => handleStatusOpenDialog(order, "completed")}
                                >
                                  <CheckCircle className="size-3.5 mr-2 text-green-500" />
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleStatusOpenDialog(order, "cancelled")}
                                  className="text-destructive"
                                >
                                  <XCircle className="size-3.5 mr-2" />
                                  Cancel Order
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expandedId === order.id && order.items && order.items.length > 0 && (
                      <TableRow key={`${order.id}-items`}>
                        <TableCell colSpan={tab === "b2c" ? 9 : 8} className="bg-muted/20 p-0">
                          <div className="px-12 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Order Items ({order.items.length})
                              </p>
                              {tab === "regular" && order.status !== "completed" && order.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStatusOpenDialog(order, "completed")
                                  }}
                                  className="h-8 px-3 rounded-lg gap-1 text-xs"
                                >
                                  <CheckCircle className="size-3.5" />
                                  Complete Order
                                </Button>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-background border">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="font-medium truncate">{item.product_name}</span>
                                    <span className="text-muted-foreground font-mono text-xs">{item.product_sku}</span>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-muted-foreground">x{item.quantity}</span>
                                    <span className="text-muted-foreground">
                                      ₹{Number((item as { unit_price?: number }).unit_price || 0).toFixed(2)}
                                    </span>
                                    <span className="font-medium w-20 text-right tabular-nums">
                                      ₹{Number((item as { total_price?: number }).total_price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t text-sm">
                              <span className="font-medium">Total</span>
                              <span className="font-semibold tabular-nums">₹{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {pendingStatus && statusTransitionMessages[pendingStatus]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted border">
              <div>
                <p className="font-medium">{selectedOrder?.order_number}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name || "Walk-in"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: <span className="tabular-nums">₹{selectedOrder?.total.toFixed(2)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs font-normal", statusStyles[selectedOrder?.status || "pending"])}
                >
                  {ORDER_STATUS_CONFIG[selectedOrder?.status || "pending"]?.label}
                </Badge>
                {pendingStatus && pendingStatus !== selectedOrder?.status && (
                  <>
                    <span className="text-muted-foreground text-sm">→</span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-normal", statusStyles[pendingStatus])}
                    >
                      {ORDER_STATUS_CONFIG[pendingStatus]?.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleStatusConfirm} disabled={updating} className="rounded-lg gap-1.5">
              {updating && <RefreshCw className="size-3.5 animate-spin" />}
              {updating ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
