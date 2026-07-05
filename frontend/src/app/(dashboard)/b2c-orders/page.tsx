"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { CheckCircle, Clock, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { clientApi } from "@/lib/client-api"

interface B2COrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface B2COrder {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string | null
  store_id: number
  shopkeeper_id: number
  payment_type: string
  status: string
  subtotal: number
  discount: number
  gst: number
  total: number
  notes: string | null
  created_at: string
  items: B2COrderItem[]
}

const statusStyles: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800 border-orange-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
}

export default function B2COrdersPage() {
  const [orders, setOrders] = useState<B2COrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<B2COrder | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi.get<B2COrder[]>("/api/v1/b2c/shopkeeper/orders")
      setOrders(data)
    } catch (err) {
      console.error("Failed to load B2C orders", err)
      toast.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const interval = setInterval(loadOrders, 5000)
    return () => clearInterval(interval)
  }, [loadOrders])

  const handleApprove = async () => {
    if (!selectedOrder) return
    setActionLoading(true)
    try {
      await clientApi.post(`/api/v1/b2c/shopkeeper/orders/${selectedOrder.id}/approve`, {})
      toast.success(`Order ${selectedOrder.order_number} approved!`)
      setDialogOpen(false)
      setSelectedOrder(null)
      await loadOrders()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve order"
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedOrder) return
    setActionLoading(true)
    try {
      await clientApi.post(`/api/v1/b2c/shopkeeper/orders/${selectedOrder.id}/confirm`, {})
      toast.success(`Order ${selectedOrder.order_number} completed! Inventory deducted and receipt generated.`)
      setDialogOpen(false)
      setSelectedOrder(null)
      await loadOrders()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete order"
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  const pendingOrders = orders.filter(o => o.status === "pending")
  const confirmedOrders = orders.filter(o => o.status === "confirmed")
  const displayOrders = activeTab === "pending" ? pendingOrders : confirmedOrders

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6 pb-8 bg-[#F8FAFC] min-h-screen">
        <h1 className="text-3xl font-bold text-slate-900">B2C Orders</h1>
        <div className="bg-slate-100 rounded-xl p-1 flex w-fit animate-pulse">
          <div className="px-4 py-2 rounded-lg bg-white shadow-sm text-sm">Pending (0)</div>
          <div className="px-4 py-2 rounded-lg text-sm text-slate-500">Confirmed (0)</div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse flex items-center px-6 gap-4">
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-16" />
              <div className="h-4 bg-slate-200 rounded w-12" />
              <div className="h-4 bg-slate-200 rounded w-16 ml-auto" />
              <div className="h-5 bg-slate-200 rounded-full w-20" />
              <div className="h-4 bg-slate-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">B2C Orders</h1>
        <Badge variant="outline" className="text-sm rounded-lg px-3 py-1 border-slate-200 text-slate-600">
          {pendingOrders.length} pending
        </Badge>
      </div>

      {/* Tab Switcher */}
      <div className="bg-slate-100 rounded-xl p-1 flex w-fit">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "pending" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Pending ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("confirmed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "confirmed" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Confirmed ({confirmedOrders.length})
        </button>
      </div>

      {displayOrders.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="size-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {activeTab === "pending" ? "No pending B2C orders" : "No confirmed B2C orders"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {activeTab === "pending" ? "New customer orders will appear here." : "Approve pending orders to see them here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-slate-500 font-medium">Order #</TableHead>
                <TableHead className="text-slate-500 font-medium">Customer</TableHead>
                <TableHead className="text-slate-500 font-medium">Type</TableHead>
                <TableHead className="text-slate-500 font-medium">Items</TableHead>
                <TableHead className="text-slate-500 font-medium">Total</TableHead>
                <TableHead className="text-slate-500 font-medium">Status</TableHead>
                <TableHead className="text-slate-500 font-medium">Date</TableHead>
                <TableHead className="text-slate-500 font-medium">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono font-medium text-slate-900">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-slate-500">{order.customer_phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-lg px-2.5 py-0.5 ${order.payment_type === "online" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                      {order.payment_type === "online" ? "Online" : "Counter"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">{order.items?.length || 0} items</span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[order.status] || "bg-gray-100"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order)
                          setDialogOpen(true)
                        }}
                        className="rounded-xl h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      >
                        <CheckCircle className="size-3.5" />
                        Approve
                      </Button>
                    )}
                    {order.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedOrder(order)
                          setDialogOpen(true)
                        }}
                        className="rounded-xl h-9 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 gap-1.5"
                      >
                        <Package className="size-3.5" />
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          {selectedOrder?.status === "pending" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-slate-900">Approve B2C Order</DialogTitle>
                <DialogDescription>
                  Are you sure you want to approve order <strong>{selectedOrder?.order_number}</strong>?
                  <br /><br />
                  <strong>Customer:</strong> {selectedOrder?.customer_name}<br />
                  <strong>Type:</strong> {selectedOrder?.payment_type === "online" ? "Online Payment" : "Pay at Counter"}<br />
                  <strong>Total:</strong> ₹{selectedOrder?.total.toFixed(2)}<br /><br />
                  The order will be marked as <strong>Confirmed</strong>. Inventory will be deducted and receipt generated when you mark it as <strong>Completed</strong>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-11 px-5">Cancel</Button>
                <Button onClick={handleApprove} disabled={actionLoading} className="rounded-xl h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? "Approving..." : "Approve"}
                </Button>
              </DialogFooter>
            </>
          )}
          {selectedOrder?.status === "confirmed" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-slate-900">Complete B2C Order</DialogTitle>
                <DialogDescription>
                  Are you sure you want to mark order <strong>{selectedOrder?.order_number}</strong> as completed?
                  <br /><br />
                  <strong>Customer:</strong> {selectedOrder?.customer_name}<br />
                  <strong>Type:</strong> {selectedOrder?.payment_type === "online" ? "Online Payment" : "Pay at Counter"}<br />
                  <strong>Total:</strong> ₹{selectedOrder?.total.toFixed(2)}<br /><br />
                  This will deduct inventory, generate a receipt, and mark the order as <strong>Completed</strong>. The customer will see this in their Past Orders.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-11 px-5">Cancel</Button>
                <Button onClick={handleComplete} disabled={actionLoading} className="rounded-xl h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? "Completing..." : "Confirm & Complete"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
