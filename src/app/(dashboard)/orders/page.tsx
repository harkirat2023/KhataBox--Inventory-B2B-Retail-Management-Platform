"use client"

import { useEffect, useState, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Package, CheckCircle, XCircle, Clock } from "lucide-react"
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

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  processing: { label: "Ready", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
}

const statusOptions: OrderStatus[] = ["pending", "confirmed", "processing", "completed", "cancelled"]

// Only show actionable status changes (not completed/cancelled orders)
const getNextStatus = (current: OrderStatus): OrderStatus | null => {
  if (current === "pending") return "confirmed"
  if (current === "confirmed") return "processing"
  if (current === "processing") return "completed"
  return null
}

const statusTransitionMessages: Record<string, Partial<Record<OrderStatus, string>>> = {
  pending: { confirmed: "Are you sure you want to confirm this order? Stock will be reserved." },
  confirmed: { processing: "Are you sure you want to mark this order as ready for pickup?" },
  processing: { completed: "Are you sure you want to complete this order? Inventory will be deducted." },
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const data = await clientApi.get<Order[]>("/api/v1/orders/")
      setOrders(data)
    } catch (err) {
      console.error("Failed to load orders", err)
    }
  }, [])

  useEffect(() => {
    loadOrders()

    const intervalId = window.setInterval(() => {
      loadOrders()
    }, 3000)

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

      // Show success notification based on status
      const messages: Record<OrderStatus, string> = {
        confirmed: "Order confirmed! Stock has been reserved.",
        processing: "Order marked as ready for pickup!",
        completed: "Order completed! Receipt generated and inventory deducted.",
        cancelled: "Order cancelled! Stock has been released.",
        pending: "Order pending.",
      }
      toast.success(messages[pendingStatus] || "Status updated")
    } catch (err: unknown) {
      const error = err as { detail?: string }
      toast.error(error?.detail || "Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const filtered = orders.filter(
    (o) =>
      (o.status === "pending" || o.status === "confirmed" || o.status === "processing") &&
      (o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Badge variant="outline" className="text-sm">
          {filtered.length} active
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No active orders. Completed orders are in Order History.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((order) => (
              <Fragment key={order.id}>
                <TableRow key={order.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <TableCell>
                    {expandedId === order.id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customer_name || "—"}</TableCell>
                  <TableCell>{order.items?.length || 0}</TableCell>
                  <TableCell className="font-medium">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs px-2 py-0 ${statusStyles[order.status]}`}>
                      {statusConfig[order.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
                {expandedId === order.id && order.items && order.items.length > 0 && (
                  <TableRow key={`${order.id}-items`}>
                    <TableCell colSpan={7} className="bg-muted/30 p-0">
                      <div className="px-10 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Items</p>
                          {getNextStatus(order.status) && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusOpenDialog(order, getNextStatus(order.status)!)
                              }}
                              className="gap-1"
                            >
                              {getNextStatus(order.status) === "confirmed" && <Clock className="size-3" />}
                              {getNextStatus(order.status) === "processing" && <Package className="size-3" />}
                              {getNextStatus(order.status) === "completed" && <CheckCircle className="size-3" />}
                              {statusConfig[getNextStatus(order.status)!].label}
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
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {selectedOrder && pendingStatus && statusTransitionMessages[selectedOrder.status]?.[pendingStatus]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="font-medium">{selectedOrder?.order_number}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name || "Walk-in"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusStyles[selectedOrder?.status || "pending"]}>
                  {selectedOrder && statusConfig[selectedOrder.status].label}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className={statusStyles[pendingStatus || "pending"]}>
                  {pendingStatus && statusConfig[pendingStatus].label}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleStatusConfirm} disabled={updating}>
              {updating ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
