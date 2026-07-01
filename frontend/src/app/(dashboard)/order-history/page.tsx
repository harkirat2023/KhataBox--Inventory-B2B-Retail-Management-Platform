"use client"

import { useEffect, useState, useCallback, useMemo, Fragment } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Search, Filter, Calendar, Receipt, XCircle } from "lucide-react"
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
import { Order, OrderStatus } from "@/types/order"
import { clientApi } from "@/lib/client-api"
import { useBillingStore } from "@/store/billing"

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

export default function OrderHistoryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const handleStatusChange = (value: string | null) => setStatusFilter(value || "all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi.get<Order[]>("/api/v1/orders/")
      setOrders(data)
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

  const allItems = [...orders, ...billingDisplayItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const filtered = allItems.filter((o) => {
    // Only show completed or cancelled orders
    const isHistorical = o.status === "completed" || o.status === "cancelled"
    if (!isHistorical) return false

    // Search filter
    const matchesSearch =
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(search.toLowerCase())

    // Status filter
    const matchesStatus = statusFilter === "all" || o.status === statusFilter

    // Date range filter
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

  const completedCount = orders.filter((o) => o.status === "completed").length
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length + billingCancelledCarts.length
  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order History</h1>
          <p className="text-muted-foreground">View completed and cancelled orders.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/orders")}>
          View Active Orders
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{cancelledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search order number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
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
                  No order history found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((order) => {
              const isBilling = "isBillingCart" in order && (order as BillingDisplayItem).isBillingCart
              const id = isBilling ? String(order.id) : String((order as Order).id)
              const items = order.items || []
              return (
              <Fragment key={id}>
                <TableRow className={`cursor-pointer ${isBilling ? "bg-muted/20" : ""}`} onClick={() => setExpandedId(expandedId === id ? null : id)}>
                  <TableCell>
                    {expandedId === id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className={`font-mono text-sm font-medium ${isBilling ? "text-muted-foreground italic" : ""}`}>
                    {isBilling ? order.order_number : (order as Order).order_number}
                  </TableCell>
                  <TableCell className="text-sm">{order.customer_name || "—"}</TableCell>
                  <TableCell>{items.length}</TableCell>
                  <TableCell className="font-medium">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs px-2 py-0 ${statusStyles[order.status]}`}>
                      {isBilling ? "Cancelled (Billing)" : statusConfig[order.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
                {expandedId === id && items.length > 0 && (
                  <TableRow key={`${id}-items`}>
                    <TableCell colSpan={7} className="bg-muted/30 p-0">
                      <div className="px-10 py-3 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</p>
                        {items.map((item: { id: number; product_name: string; product_sku: string; quantity: number; unit_price: number; total: number }, idx: number) => (
                          <div key={item.id || idx} className="flex items-center justify-between text-sm">
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
            )})}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}