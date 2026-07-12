"use client"

import { useEffect, useState, useCallback, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Search, Filter, Calendar, Package, Receipt, XCircle, Store, FileText, Plus, X as XIcon } from "lucide-react"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Order, OrderStatus } from "@/types/order"
import { clientApi, authHeaders } from "@/lib/client-api"
import { useBillingStore } from "@/store/billing"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ORDER_STATUS_CONFIG } from "@/lib/ui-constants"

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
  const [unpackedDialog, setUnpackedDialog] = useState<{ open: boolean; productName: string; orderItemId: number }>({ open: false, productName: "", orderItemId: 0 })
  const [newProductName, setNewProductName] = useState("")
  const [newProductSku, setNewProductSku] = useState("")
  const [newProductCostPrice, setNewProductCostPrice] = useState<number>(0)
  const [newProductSellingPrice, setNewProductSellingPrice] = useState<number>(0)
  const [newProductQuantity, setNewProductQuantity] = useState<number>(1)
  const [newProductReorderThreshold, setNewProductReorderThreshold] = useState<number>(10)
  const [savingProduct, setSavingProduct] = useState(false)


  const handleViewInvoice = async (orderId: number) => {
    setViewingInvoiceId(orderId)
    setInvoiceUrl(null)
    try {
      const url = `${API_URL}/api/v1/invoices/generate/${orderId}`
      console.debug("Fetching invoice from:", url)
      const resp = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
      })
      if (!resp.ok) {
        const text = await resp.text()
        const detail = text.length < 500 ? text : text.slice(0, 500)
        throw new Error(detail || `Server error ${resp.status}`)
      }
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      setInvoiceUrl(blobUrl)
    } catch (err) {
      const msg = err instanceof TypeError
        ? `Network error — check if backend is running at ${API_URL}`
        : (err instanceof Error ? err.message : "Failed to load invoice")
      toast.error(msg)
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
        clientApi.get<Order[]>("/api/v1/b2c/shopkeeper/order-history"),
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

  // For customers/B2C orders moved into this screen: treat all B2C (completed/pending/etc) as part of the All view.
  const sourceAllCombinedOrders = historyTab === "all" ? [...orders, ...b2cOrders] : sourceAllOrders




  const allItems = [...sourceAllCombinedOrders, ...billingDisplayItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const filtered = allItems.filter((o) => {
    // Requirement:
    // - In this page, B2C orders should appear regardless of status (e.g. B2C-completed, pending, etc.)
    // - Regular orders still filtered to completed/cancelled.
    if (historyTab === "regular") {
      const isHistorical = o.status === "completed" || o.status === "cancelled"
      if (!isHistorical) return false
    }
    if (historyTab === "b2c") {
      // B2C API doesn't include `is_b2c`, so detect via order_number prefix.
      // B2C orders use order_number prefix like `B2C-...`.
      const orderNumber = o.order_number || ""
      const isB2COrder = orderNumber.startsWith("B2C-")
      if (!isB2COrder) return false
    }

    if (historyTab === "all") {
      // For all: include everything from both sources (regular+ b2c) but keep billing carts as-is.
    }

    const matchesSearch =
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(search.toLowerCase())

    const normalizedStatus = String(o.status).toLowerCase()
    const matchesStatus =
      statusFilter === "all" ||
      o.status === statusFilter ||
      normalizedStatus === statusFilter ||
      // Allow B2C-prefixed statuses if backend uses labels like "B2C-completed"
      normalizedStatus.replace(/^b2c-/, "") === statusFilter

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

  // Completed counts (dynamic) split by Regular vs B2C
  const isB2COrder = (o: Order) => (o.order_number || "").startsWith("B2C-")

  const completedRegularCount = orders.filter((o) => o.status === "completed").length
  const completedB2CCount = b2cOrders.filter((o) => o.status === "completed").length
  const completedCount = historyTab === "b2c" ? completedB2CCount : historyTab === "regular" ? completedRegularCount : completedRegularCount + completedB2CCount

  const cancelledCount = sourceAllOrders.filter((o) => o.status === "cancelled" || o.status === "rejected").length + billingCancelledCarts.length

  // Maintain Total Revenue updated based on completed orders within current view.
  // For B2C, count completed regardless of label.
  const totalRevenue = [...(historyTab === "b2c" ? b2cOrders : historyTab === "regular" ? orders : [...orders, ...b2cOrders])]
    .filter((o) => String(o.status) === "completed" || String(o.status).toLowerCase() === "b2c-completed")
    .reduce((sum, o) => sum + (o.total || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6 pb-8 bg-background min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Order History</h1>
            <div className="h-4 bg-muted rounded w-48 mt-2 animate-pulse" />
          </div>
          <div className="h-11 bg-muted rounded-xl w-40 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
          <div className="px-4 py-2 text-sm font-medium rounded-lg bg-card shadow-sm">All History</div>
          <div className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground">Regular Orders</div>
          <div className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground">B2C History</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-8 bg-muted rounded w-16 mt-3" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto animate-pulse">
          <div className="bg-muted px-6 py-4 flex gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded w-20" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex gap-4 border-t border-border">
              {[...Array(7)].map((_, j) => (
                <div key={j} className="h-4 bg-muted rounded w-20" />
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
      const endpointMap: Record<typeof action, string> = {
        approve: `/api/v1/b2c/shopkeeper/orders/${orderId}/approve`,
        reject: `/api/v1/b2c/shopkeeper/orders/${orderId}/reject`,
        processing: `/api/v1/b2c/shopkeeper/orders/${orderId}/processing`,
        confirm: `/api/v1/b2c/shopkeeper/orders/${orderId}/confirm`,
        cancel: `/api/v1/b2c/shopkeeper/orders/${orderId}/cancel`,
      }
      const resp = await fetch(`${API_URL}${endpointMap[action]}`, {
        method: "POST",
        headers: authHeaders(),
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

  const getB2CActionButtons = (o: { status: string; id: number }) => {
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
    <div className="space-y-6 pb-8 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Order History</h1>
          <p className="text-muted-foreground">View completed and cancelled orders.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/orders")} className="rounded-xl h-11 px-5 bg-card border border-border text-foreground/80 hover:bg-muted hover:border-border">
          View Active Orders
        </Button>
      </div>

      {/* History Tabs */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setHistoryTab("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            historyTab === "all" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          All History
        </button>
        <button
          onClick={() => setHistoryTab("regular")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            historyTab === "regular" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          Regular Orders
        </button>
        <button
          onClick={() => setHistoryTab("b2c")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            historyTab === "b2c" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          <Store className="size-4 inline mr-1" />
          B2C History
          {b2cOrders.filter((o) => o.status === "completed").length > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              {b2cOrders.filter((o) => o.status === "completed").length}
            </Badge>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Completed split (Regular vs B2C) */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <p className="text-sm font-medium text-muted-foreground">Completed Orders</p>

          <div className="mt-1">
            <p className="text-3xl font-bold text-foreground">{completedCount}</p>
          </div>

          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Regular</p>
              <p className="text-xl font-bold text-foreground mt-1">{completedRegularCount}</p>
            </div>
            <div className="rounded-xl bg-muted border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">B2C</p>
              <p className="text-xl font-bold text-foreground mt-1">{completedB2CCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <p className="text-sm font-medium text-muted-foreground">Cancelled Orders</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{cancelledCount}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold text-foreground mt-1">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>


      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search order number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted border-0"
              inputMode="search"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="rounded-xl h-11 border-border">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="b2c-completed">B2C-Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From date"
              className="rounded-xl h-11 border-border"
              inputMode="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To date"
              className="rounded-xl h-11 border-border"
              inputMode="text"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="w-[40px] text-muted-foreground font-medium"></TableHead>
              <TableHead className="text-muted-foreground font-medium">Order #</TableHead>
              <TableHead className="text-muted-foreground font-medium">Customer</TableHead>
              <TableHead className="text-muted-foreground font-medium">Items</TableHead>
              <TableHead className="text-muted-foreground font-medium">Total</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="size-10 text-muted-foreground" />
                    <p className="text-muted-foreground font-medium">No results found</p>
                    <p className="text-muted-foreground text-sm">No order history matching your filters.</p>
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
                <TableRow className={`cursor-pointer ${isBilling ? "bg-muted/50" : ""}`} onClick={() => setExpandedId(expandedId === id ? null : id)}>
                  <TableCell>
                    {expandedId === id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className={`font-mono text-sm font-medium ${isBilling ? "text-muted-foreground italic" : "text-foreground"}`}>
                    {isBilling ? order.order_number : (order as Order).order_number}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/80">{order.customer_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{items.length}</TableCell>
                  <TableCell className="font-medium text-foreground">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className={`text-xs px-2 py-0 ${ORDER_STATUS_CONFIG[order.status]?.color || ""}`}>
                        {isBilling ? "Cancelled (Billing)" : ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                      </Badge>
                      {!isBilling && historyTab === "b2c" && getB2CActionButtons(order as unknown as { status: string; id: number })}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="w-[80px]">
                    {!isBilling && order.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-xl"
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
                    <TableCell colSpan={7} className="bg-muted/50 p-0">
                      <div className="px-10 py-3 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</p>
                        {!isBilling && (order as Order).revision_number && (order as Order).revision_number! > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Revision History</p>
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              <span className="font-mono text-muted-foreground">Rev {(order as Order).revision_number}</span>
                              <span className="text-muted-foreground">Previous: ₹{(order as Order).previous_total?.toFixed(2)}</span>
                              {(order as Order).adjustment_total !== null && (order as Order).adjustment_total !== undefined && (
                                <span className={(order as Order).adjustment_total! >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  Adjustment: {(order as Order).adjustment_total! >= 0 ? "+" : ""}₹{(order as Order).adjustment_total!.toFixed(2)}
                                </span>
                              )}
                              {(order as Order).revision_status && (
                                <span className="font-medium">{(order as Order).revision_status}</span>
                              )}
                            </div>
                          </div>
                        )}
                        {items.map((item: { id: number; product_name: string; product_sku: string; quantity: number; unit_price?: number; total?: number; total_price?: number }, idx: number) => {
                          const isUnpacked = item.product_sku === "UNPACKED" || item.product_name.startsWith("Unpacked")
                          return (
                          <div key={item.id || idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-foreground">{item.product_name}</span>
                              <span className="text-muted-foreground font-mono text-xs">{item.product_sku}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">x{item.quantity}</span>
                              <span className="text-muted-foreground">
                                ₹{typeof item.unit_price === "number" ? item.unit_price.toFixed(2) : Number(item.unit_price || 0).toFixed(2)}
                              </span>
                              <span className="font-medium w-20 text-right text-foreground">
                                ₹{typeof (item as { total_price?: number }).total_price === "number"
                                  ? (item as { total_price: number }).total_price.toFixed(2)
                                  : typeof item.total === "number"
                                    ? item.total.toFixed(2)
                                    : Number(item.total_price || item.total || 0).toFixed(2)}
                              </span>
                              {isUnpacked && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setNewProductName(item.product_name)
                                      setNewProductSku("")
                                      setNewProductCostPrice(0)
                                      setNewProductSellingPrice(item.unit_price || 0)
                                      setNewProductQuantity(item.quantity)
                                      setNewProductReorderThreshold(10)
                                      setUnpackedDialog({ open: true, productName: item.product_name, orderItemId: item.id })
                                    }}
                                  >
                                    <Plus className="size-3 mr-1" />
                                    Add to Inventory
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          )
                        })}
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
            <ScrollArea className="h-[70vh] w-full rounded-xl border border-border">
              <iframe
                src={invoiceUrl}
                className="w-full h-full min-h-[70vh]"
                title={`Invoice ${viewingInvoiceId}`}
              />
            </ScrollArea>
          )}
          {!invoiceUrl && viewingInvoiceId && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Inventory Dialog */}
      <Dialog open={unpackedDialog.open} onOpenChange={(open) => setUnpackedDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Inventory</DialogTitle>
            <DialogDescription>Convert this unpacked product into a regular inventory item.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Product Name</label>
              <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="rounded-xl border-border h-11" inputMode="text" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">SKU</label>
              <Input value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} className="rounded-xl border-border h-11" inputMode="text" placeholder="Auto-generated if empty" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Cost Price (₹)</label>
                <Input type="number" min="0" step="0.01" value={newProductCostPrice || ""} onChange={(e) => setNewProductCostPrice(parseFloat(e.target.value) || 0)} className="rounded-xl border-border h-11" inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Selling Price (₹)</label>
                <Input type="number" min="0" step="0.01" value={newProductSellingPrice || ""} onChange={(e) => setNewProductSellingPrice(parseFloat(e.target.value) || 0)} className="rounded-xl border-border h-11" inputMode="decimal" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Quantity</label>
                <Input type="number" min="0" step="1" value={newProductQuantity || ""} onChange={(e) => setNewProductQuantity(parseInt(e.target.value) || 0)} className="rounded-xl border-border h-11" inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Reorder Threshold</label>
                <Input type="number" min="0" step="1" value={newProductReorderThreshold || ""} onChange={(e) => setNewProductReorderThreshold(parseInt(e.target.value) || 0)} className="rounded-xl border-border h-11" inputMode="numeric" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl" onClick={() => setUnpackedDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl"
              disabled={savingProduct}
              onClick={async () => {
                if (!newProductName.trim()) {
                  toast.error("Product name is required")
                  return
                }
                setSavingProduct(true)
                try {
                  const sku = newProductSku.trim() || `UNPACKED-${Date.now()}`
                  await clientApi.post("/api/v1/products/", {
                    name: newProductName.trim(),
                    sku,
                    cost_price: newProductCostPrice,
                    selling_price: newProductSellingPrice,
                    stock_quantity: newProductQuantity,
                    reorder_threshold: newProductReorderThreshold,
                  })
                  toast.success(`${newProductName.trim()} added to inventory`)
                  setUnpackedDialog(prev => ({ ...prev, open: false }))
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to add product")
                } finally {
                  setSavingProduct(false)
                }
              }}
            >
              {savingProduct ? "Adding..." : "Add to Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
