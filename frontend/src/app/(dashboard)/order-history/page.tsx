"use client"

import { useEffect, useState, useCallback, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Search, Filter, Calendar, Package, Receipt, XCircle, Store, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Order, OrderStatus } from "@/types/order"
import { clientApi, getToken } from "@/lib/client-api"
import { useBillingStore } from "@/store/billing"
import { ScrollArea } from "@/components/ui/scroll-area"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

interface BillingDisplayItem {
  id: string
  isBillingCart: true
  order_number: string
  customer_name: string
  items: { id: number; product_name: string; product_sku: string; quantity: number; unit_price: number; total: number }[]
  total: number
  status: OrderStatus
  created_at: string
  shopkeeper_id?: number
  customer_id?: number | null
  subtotal?: number
  discount?: number
  gst?: number
  payment_method?: string
  notes?: string | null
  updated_at?: string
  order_number_display?: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  counter: { label: "Counter", variant: "secondary" },
  processing: { label: "Ready", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  counter: "bg-orange-100 text-orange-800 border-orange-300",
  processing: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
}

type HistoryTab = "all" | "regular" | "b2c"

export default function OrderHistoryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [b2cOrders, setB2cOrders] = useState<Order[]>([])
  const [historyTab, setHistoryTab] = useState<HistoryTab>("all")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const handleStatusChange = (value: string | null) => setStatusFilter(value || "all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)


  const handleViewInvoice = async (orderId: number) => {
    setViewingInvoiceId(orderId)
    setInvoiceUrl(null)
    try {
      const token = await getToken()
      const resp = await fetch(`${API_URL}/api/v1/invoices/generate/${orderId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!resp.ok) throw new Error("Failed to generate invoice")
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      setInvoiceUrl(url)
    } catch {
      toast.error("Failed to load invoice")
      setViewingInvoiceId(null)
    }
  }

  const closeInvoice = () => {
    if (invoiceUrl) {
      URL.revokeObjectURL(invoiceUrl)
    }
    setViewingInvoiceId(null)
    setInvoiceUrl(null)
  }

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const [regData, b2cData] = await Promise.all([
        clientApi.get<Order[]>("/api/v1/orders/"),
        clientApi.get<Order[]>("/api/v1/orders/?b2c=true"),
      ])
      setOrders(regData)
      setB2cOrders(b2cData)
    } catch (err) {
      console.error("Failed to load orders", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const billingCarts = useBillingStore((s) => s.carts)
  const billingCancelledCarts = useMemo(() => billingCarts.filter((c) => c.status === "cancelled"), [billingCarts])
  const billingDisplayItems: BillingDisplayItem[] = billingCancelledCarts.map((cart) => {
    const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    return {
      id: `billing-${cart.id}`,
      isBillingCart: true,
      order_number: cart.name,
      customer_name: "Billing Cart",
      items: cart.items.map((item, idx) => ({
        id: idx,
        product_name: item.name,
        product_sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.unit_price * item.quantity,
      })),
      total: cartTotal,
      status: "cancelled" as OrderStatus,
      created_at: cart.cancelledAt || cart.createdAt,
    }
  })

  const sourceCompletedOrders = historyTab === "b2c" ? b2cOrders : orders
  const sourceAllOrders = historyTab === "b2c" ? b2cOrders : orders

  const allItems = [...sourceAllOrders, ...billingDisplayItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const filtered = allItems.filter((o) => {
    if (historyTab === "b2c") {
      const isB2CCompleted = o.status === "completed" && "is_b2c" in o
      if (!isB2CCompleted && o.status !== "cancelled") return false
    } else {
      const isHistorical = o.status === "completed" || o.status === "cancelled"
      if (!isHistorical) return false
    }

    const matchesSearch =
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "all" || o.status === statusFilter

    let matchesDate = true
    const orderDate = new Date(o.created_at)
    if (dateFrom) {
      matchesDate = matchesDate && orderDate >= new Date(dateFrom)
    }
    if (dateTo) {
      matchesDate = matchesDate && orderDate <= new Date(dateTo + "T23:59:59")
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const completedCount = sourceCompletedOrders.filter((o) => o.status === "completed").length
  const cancelledCount = sourceAllOrders.filter((o) => o.status === "cancelled").length + billingCancelledCarts.length
  const totalRevenue = sourceCompletedOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0)

  if (loading) {
    return (
      <div className="space-y-6 pb-8 bg-[#F8FAFC] min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Order History</h1>
            <div className="h-4 bg-slate-200 rounded w-48 mt-2 animate-pulse" />
          </div>
          <div className="h-11 bg-slate-200 rounded-xl w-40 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <div className="px-4 py-2 text-sm font-medium rounded-lg bg-white shadow-sm">All History</div>
          <div className="px-4 py-2 text-sm font-medium rounded-lg text-slate-500">Regular Orders</div>
          <div className="px-4 py-2 text-sm font-medium rounded-lg text-slate-500">B2C History</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-8 bg-slate-200 rounded w-16 mt-3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="bg-slate-50 px-6 py-4 flex gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded w-20" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex gap-4 border-t border-slate-100">
              {[...Array(7)].map((_, j) => (
                <div key={j} className="h-4 bg-slate-200 rounded w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const callB2CAction = async (orderId: number, action: "approve" | "reject" | "processing" | "confirm" | "cancel") => {
    try {
      setActionLoadingId(String(orderId))
      const token = await getToken()
      const endpointMap: Record<typeof action, string> = {
        approve: `/api/v1/b2c/shopkeeper/orders/${orderId}/approve`,
        reject: `/api/v1/b2c/shopkeeper/orders/${orderId}/reject`,
        processing: `/api/v1/b2c/shopkeeper/orders/${orderId}/processing`,
        confirm: `/api/v1/b2c/shopkeeper/orders/${orderId}/confirm`,
        cancel: `/api/v1/b2c/shopkeeper/orders/${orderId}/cancel`,
      }
      const resp = await fetch(`${API_URL}${endpointMap[action]}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!resp.ok) throw new Error("Action failed")
      toast.success("Order status updated")
      await loadOrders()
    } catch {
      toast.error("Failed to update order")
    } finally {
      setActionLoadingId(null)
    }
  }

  const getB2CActionButtons = (o: any) => {
    const status = o.status as string
    const id = o.id as number
    const canPending = status === "pending"
    const canConfirmed = status === "confirmed"
    const canProcessing = status === "processing"
    const canCancel = ["pending", "confirmed", "processing"].includes(status)

    if (!("is_b2c" in o) && !(historyTab === "b2c")) return null

    return (
      <div className="flex flex-wrap gap-2">
        {canPending && (
          <>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={(e) => { e.stopPropagation(); callB2CAction(id, "approve") }}
              disabled={actionLoadingId === String(id)}
            >
              Accept Order
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-xl"
              onClick={(e) => { e.stopPropagation(); callB2CAction(id, "reject") }}
              disabled={actionLoadingId === String(id)}
            >
              Reject Order
            </Button>
          </>
        )}

        {canConfirmed && (
          <>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={(e) => { e.stopPropagation(); callB2CAction(id, "processing") }}
              disabled={actionLoadingId === String(id)}
            >
              Mark as Processing
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl"
              onClick={(e) => { e.stopPropagation(); callB2CAction(id, "cancel") }}
              disabled={actionLoadingId === String(id)}
            >
              Cancel Order
            </Button>
          </>
        )}

        {canProcessing && (
          <>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={(e) => { e.stopPropagation(); callB2CAction(id, "confirm") }}
              disabled={actionLoadingId === String(id)}
            >
              Mark as Completed
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl"
              onClick={(e) => { e.stopPropagation(); callB2CAction(id, "cancel") }}
              disabled={actionLoadingId === String(id)}
            >
              Cancel Order
            </Button>
          </>
        )}

        {!canPending && !canConfirmed && !canProcessing && canCancel && (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl"
            onClick={(e) => { e.stopPropagation(); callB2CAction(id, "cancel") }}
            disabled={actionLoadingId === String(id)}
          >
            Cancel Order
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Order History</h1>
          <p className="text-slate-500">View completed and cancelled orders.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/orders")} className="rounded-xl h-11 px-5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
          View Active Orders
        </Button>
      </div>

      {/* History Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setHistoryTab("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            historyTab === "all" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All History
        </button>
        <button
          onClick={() => setHistoryTab("regular")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            historyTab === "regular" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Regular Orders
        </button>
        <button
          onClick={() => setHistoryTab("b2c")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            historyTab === "b2c" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Store className="size-4 inline mr-1" />
          B2C History
          {b2cOrders.filter((o) => o.status === "completed").length > 0 && (
            <Badge className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0">
              {b2cOrders.filter((o) => o.status === "completed").length}
            </Badge>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-500">Completed Orders</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{completedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-500">Cancelled Orders</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{cancelledCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-500">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="size-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search order number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-slate-50 border-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="rounded-xl h-11 border-slate-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-400 shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From date"
              className="rounded-xl h-11 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-400 shrink-0" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To date"
              className="rounded-xl h-11 border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Results */}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="size-10 text-slate-300" />
                    <p className="text-slate-500 font-medium">No results found</p>
                    <p className="text-slate-400 text-sm">No order history matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((order) => {
              const isBilling = "isBillingCart" in order && (order as BillingDisplayItem).isBillingCart
              const id = isBilling ? String(order.id) : String((order as Order).id)
              const items = order.items || []
              return (
              <Fragment key={id}>
                <TableRow className={`cursor-pointer ${isBilling ? "bg-slate-50/50" : ""}`} onClick={() => setExpandedId(expandedId === id ? null : id)}>
                  <TableCell>
                    {expandedId === id ? (
                      <ChevronDown className="size-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="size-4 text-slate-400" />
                    )}
                  </TableCell>
                  <TableCell className={`font-mono text-sm font-medium ${isBilling ? "text-slate-400 italic" : "text-slate-900"}`}>
                    {isBilling ? order.order_number : (order as Order).order_number}
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">{order.customer_name || "—"}</TableCell>
                  <TableCell className="text-slate-500">{items.length}</TableCell>
                  <TableCell className="font-medium text-slate-900">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className={`text-xs px-2 py-0 ${statusStyles[order.status]}`}>
                        {isBilling ? "Cancelled (Billing)" : statusConfig[order.status]?.label || order.status}
                      </Badge>
                      {!isBilling && historyTab === "b2c" && getB2CActionButtons(order)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="w-[80px]">
                    {!isBilling && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewInvoice((order as Order).id)
                        }}
                        title="View Invoice"
                      >
                        <FileText className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expandedId === id && items.length > 0 && (
                  <TableRow key={`${id}-items`}>
                    <TableCell colSpan={7} className="bg-slate-50/50 p-0">
                      <div className="px-10 py-3 space-y-3">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Items</p>
                        {items.map((item: { id: number; product_name: string; product_sku: string; quantity: number; unit_price: number; total: number }, idx: number) => (
                          <div key={item.id || idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-900">{item.product_name}</span>
                              <span className="text-slate-500 font-mono text-xs">{item.product_sku}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-slate-500">x{item.quantity}</span>
                              <span className="text-slate-500">₹{item.unit_price.toFixed(2)}</span>
                              <span className="font-medium w-20 text-right text-slate-900">₹{item.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )})}
          </TableBody>
        </Table>
      </div>

      {/* Invoice View Modal */}
      <Dialog open={viewingInvoiceId !== null} onOpenChange={(open) => !open && closeInvoice()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Invoice #{viewingInvoiceId}</DialogTitle>
          </DialogHeader>
          {invoiceUrl && (
            <ScrollArea className="h-[70vh] w-full rounded-xl border border-slate-200">
              <iframe
                src={invoiceUrl}
                className="w-full h-full min-h-[70vh]"
                title={`Invoice ${viewingInvoiceId}`}
              />
            </ScrollArea>
          )}
          {!invoiceUrl && viewingInvoiceId && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
