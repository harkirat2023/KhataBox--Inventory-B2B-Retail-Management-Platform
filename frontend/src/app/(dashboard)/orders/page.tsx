"use client"

import { useEffect, useState, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Package, Search, CheckCircle, XCircle, Clock, Store, BadgePercent } from "lucide-react"
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
import { Order, OrderStatus } from "@/types/order"
import { clientApi } from "@/lib/client-api"

type OrderTab = "all" | "regular" | "b2c"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  counter: { label: "Counter", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  counter: "bg-orange-100 text-orange-800 border-orange-300",
  processing: "bg-amber-100 text-amber-800 border-amber-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
}

const statusTransitionMessages: Record<string, string> = {
  completed: "Are you sure you want to complete this order? Inventory will be deducted and receipt generated.",
  cancelled: "Are you sure you want to cancel this order?",
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [b2cOrders, setB2cOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<OrderTab>("regular")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const [regularData, b2cData] = await Promise.all([
        clientApi.get<Order[]>("/api/v1/orders/?b2c=false"),
        clientApi.get<Order[]>("/api/v1/orders/?b2c=true"),
      ])
      setOrders(regularData)
      setB2cOrders(b2cData)
    } catch (err) {
      console.error("Failed to load orders", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    const intervalId = window.setInterval(() => loadOrders(), 3000)
    return () => window.clearInterval(intervalId)
  }, [loadOrders])

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
      await clientApi.post(`/api/v1/orders/${order.id}/approve-b2c`, {})
      await loadOrders()
      toast.success("B2C order approved and completed!")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve order")
    } finally {
      setUpdating(false)
    }
  }

  const currentOrders = tab === "b2c" ? b2cOrders : orders
  const filtered = currentOrders.filter(
    (o) =>
      (tab !== "regular" || (o.status !== "completed" && o.status !== "cancelled")) &&
      (o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name || "").toLowerCase().includes(search.toLowerCase()))
  )

  const activeRegularCount = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length

  return (
    <div className="space-y-6 pb-8 bg-[#F8FAFC] min-h-screen">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm rounded-lg px-3 py-1 border-slate-200 text-slate-600">
            {tab === "b2c" ? `${b2cOrders.length} B2C` : `${activeRegularCount} active`}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setTab("regular")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            tab === "regular" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="size-4 inline mr-1.5" />
          Regular Orders
        </button>
        <button
          onClick={() => setTab("b2c")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            tab === "b2c" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Store className="size-4 inline mr-1.5" />
          B2C Orders
          {b2cOrders.length > 0 && (
            <Badge className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0">
              {b2cOrders.length}
            </Badge>
          )}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-slate-50 border-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse flex items-center px-6 gap-4">
              <div className="size-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-12" />
              <div className="h-4 bg-slate-200 rounded w-16 ml-auto" />
              <div className="h-5 bg-slate-200 rounded-full w-20" />
              <div className="h-4 bg-slate-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[40px] text-slate-500 font-medium"></TableHead>
              <TableHead className="text-slate-500 font-medium">Order #</TableHead>
              <TableHead className="text-slate-500 font-medium">Customer</TableHead>
              <TableHead className="text-slate-500 font-medium">Items</TableHead>
              <TableHead className="text-slate-500 font-medium">Total</TableHead>
              <TableHead className="text-slate-500 font-medium">Status</TableHead>
              <TableHead className="text-slate-500 font-medium">Date</TableHead>
              {tab === "b2c" && <TableHead className="text-slate-500 font-medium">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={tab === "b2c" ? 8 : 7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="size-10 text-slate-300" />
                    <p className="text-slate-500 font-medium">No orders found</p>
                    <p className="text-slate-400 text-sm">{tab === "b2c" ? "No B2C orders from customers yet." : "No active orders right now."}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((order) => (
              <Fragment key={order.id}>
                <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <TableCell>
                    {expandedId === order.id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-slate-900">{order.order_number}</TableCell>
                  <TableCell className="text-slate-700">{order.customer_name || "—"}</TableCell>
                  <TableCell className="text-slate-500">{order.items?.length || 0}</TableCell>
                  <TableCell className="font-medium text-slate-900">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs px-2 py-0 ${statusStyles[order.status] || ""}`}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  {tab === "b2c" && (
                    <TableCell>
                      {(order.status === "counter" || order.status === "confirmed") && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApproveB2C(order)
                          }}
                          disabled={updating}
                          className="gap-1.5 rounded-xl h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="size-3.5" />
                          Approve
                        </Button>
                      )}
                      {order.status === "completed" && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          Completed
                        </Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                {expandedId === order.id && order.items && order.items.length > 0 && (
                  <TableRow key={`${order.id}-items`}>
                    <TableCell colSpan={tab === "b2c" ? 8 : 7} className="bg-muted/30 p-0">
                      <div className="px-10 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Items</p>
                          {tab === "regular" && order.status !== "completed" && order.status !== "cancelled" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusOpenDialog(order, "completed")
                              }}
                              className="gap-1.5 rounded-xl h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <CheckCircle className="size-3.5" />
                              Complete
                            </Button>
                          )}
                        </div>
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{item.product_name}</span>
                              <span className="text-muted-foreground font-mono text-xs">{item.product_sku}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">x{item.quantity}</span>
                              <span className="text-muted-foreground">₹{item.unit_price.toFixed(2)}</span>
                              <span className="font-medium w-20 text-right">₹{item.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>)}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">Confirm Status Change</DialogTitle>
            <DialogDescription>
              {pendingStatus && statusTransitionMessages[pendingStatus]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="font-medium">{selectedOrder?.order_number}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name || "Walk-in"}</p>
                <p className="text-xs text-muted-foreground mt-1">Total: ₹{selectedOrder?.total.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusStyles[selectedOrder?.status || "pending"]}>
                  {statusConfig[selectedOrder?.status || "pending"]?.label}
                </Badge>
                {pendingStatus && pendingStatus !== selectedOrder?.status && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className={statusStyles[pendingStatus]}>
                      {statusConfig[pendingStatus]?.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating} className="rounded-xl h-11 px-5">
              Cancel
            </Button>
            <Button onClick={handleStatusConfirm} disabled={updating} className="rounded-xl h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white">
              {updating ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
