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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Not Completed", variant: "outline" },
  confirmed: { label: "Not Completed", variant: "outline" },
  processing: { label: "Not Completed", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-amber-100 text-amber-800 border-amber-300",
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

  const filtered = orders.filter(
    (o) =>
      o.status !== "completed" && o.status !== "cancelled" &&
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
                          {order.status !== "completed" && order.status !== "cancelled" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusOpenDialog(order, "completed")
                              }}
                              className="gap-1"
                            >
                              <CheckCircle className="size-3" />
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
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {pendingStatus && statusTransitionMessages[pendingStatus]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="font-medium">{selectedOrder?.order_number}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name || "Walk-in"}</p>
                <p className="text-xs text-muted-foreground mt-1">Total: ₹{selectedOrder?.total.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusStyles[selectedOrder?.status || "pending"]}>
                  {selectedOrder && (selectedOrder.status === "completed" ? "Completed" : "Not Completed")}
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
