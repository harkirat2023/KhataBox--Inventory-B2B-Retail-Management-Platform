"use client"
import { useEffect, useState, useCallback, Fragment, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Loader2,
  Receipt,
  Banknote,
  CreditCard,
  Plus,
  Minus,
  Pencil,
  History,
  AlertTriangle,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Order, OrderStatus } from "@/types/order"
import { Product } from "@/types/product"
import { clientApi, authHeaders } from "@/lib/client-api"
import { cn } from "@/lib/utils"
import { ORDER_STATUS_CONFIG } from "@/lib/ui-constants"
import { STATUS_DOT_COLORS } from "@/lib/ui-constants"

type OrderTab = "changed" | "b2c"

type SortField = "order_number" | "customer_name" | "total" | "status" | "created_at"
type SortDir = "asc" | "desc" | null

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

const statusTransitionMessages: Record<string, string> = {
  completed: "Are you sure you want to complete this order? Inventory will be deducted and receipt generated.",
  cancelled: "Are you sure you want to cancel this order?",
  rejected: "Are you sure you want to reject this order? Inventory will be restored.",
}

interface EditableItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
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
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [b2cOrders, setB2cOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<OrderTab>((searchParams.get("tab") as OrderTab) || "changed")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [b2cConfirmOpen, setB2cConfirmOpen] = useState(false)
  const [b2cConfirmOrder, setB2cConfirmOrder] = useState<Order | null>(null)
  const [b2cConfirming, setB2cConfirming] = useState(false)
  const [b2cConfirmed, setB2cConfirmed] = useState(false)
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [editDiscount, setEditDiscount] = useState(0)
  const [editApplyGst, setEditApplyGst] = useState(true)
  const [editProductSearch, setEditProductSearch] = useState("")
  const [editSearchResults, setEditSearchResults] = useState<Product[]>([])
  const [editAllProducts, setEditAllProducts] = useState<Product[]>([])

  // Revision state
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [revisionOrder, setRevisionOrder] = useState<Order | null>(null)
  const [revisedItems, setRevisedItems] = useState<EditableItem[]>([])
  const [revSearchQuery, setRevSearchQuery] = useState("")
  const [revSearchResults, setRevSearchResults] = useState<Product[]>([])
  const [revAllProducts, setRevAllProducts] = useState<Product[]>([])
  const [revDiscount, setRevDiscount] = useState(0)
  const [revApplyGst, setRevApplyGst] = useState(true)
  const [revising, setRevising] = useState(false)

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

    if (search) {
      filtered = filtered.filter((o) =>
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name || "").toLowerCase().includes(search.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter)
    }

    if (tab === "changed") {
      const includeStatuses = ["completed"]
      filtered = filtered.filter((o) => includeStatuses.includes(o.status))
    } else if (tab === "b2c") {
      filtered = filtered.filter((o) => o.status === "pending" || o.status === "B2C-pending")
    }

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
        rejected: "Order rejected. Inventory restored.",
      }
      toast.success(messages[pendingStatus] || "Status updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const handleApproveB2C = async (order: Order) => {
    setB2cConfirmOrder(order)
    setB2cConfirmed(false)
    setEditableItems((order.items || []).map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: Number((i as { unit_price?: number }).unit_price || 0),
    })))
    setEditDiscount(order.discount || 0)
    setEditApplyGst(order.status !== "B2C-pending" || true)
    setEditProductSearch("")
    setEditSearchResults([])
    try {
      const data = await clientApi.get<Product[]>("/api/v1/products/")
      setEditAllProducts(data)
    } catch { }
    setB2cConfirmOpen(true)
  }

  const handleB2CConfirmSubmit = async () => {
    if (!b2cConfirmOrder) return
    if (editableItems.length === 0) {
      toast.error("Order must have at least one item")
      return
    }
    setB2cConfirming(true)
    try {
      await clientApi.post(`/api/v1/b2c/shopkeeper/orders/${b2cConfirmOrder.id}/confirm`, {
        items: editableItems.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        discount: editDiscount,
        apply_gst: editApplyGst,
      })
      setB2cConfirmed(true)
      await loadOrders()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve/complete order")
      setB2cConfirming(false)
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

  const editFilteredProducts = editProductSearch
    ? editAllProducts.filter(p =>
        p.name.toLowerCase().includes(editProductSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(editProductSearch.toLowerCase())
      )
    : []

  const editRecalc = () => {
    const sub = editableItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const gst = editApplyGst ? Math.round(sub * 0.18 * 100) / 100 : 0
    const disc = editDiscount || 0
    return { subtotal: sub, gst, total: Math.max(0, sub + gst - disc), disc }
  }

  const handleEditQty = (productId: number, delta: number) => {
    setEditableItems(prev => prev.map(i =>
      i.product_id === productId
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
    ))
  }

  const handleEditRemove = (productId: number) => {
    setEditableItems(prev => prev.filter(i => i.product_id !== productId))
  }

  const handleEditAddProduct = (product: Product) => {
    setEditableItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
      }]
    })
    setEditProductSearch("")
    setEditSearchResults([])
  }

  // --- Revision Logic ---
  const handleOpenRevision = async (order: Order) => {
    setRevisionOrder(order)
    setRevisedItems((order.items || []).map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: Number((i as { unit_price?: number }).unit_price || 0),
    })))
    setRevDiscount(order.discount || 0)
    setRevApplyGst(order.gst > 0)
    setRevSearchQuery("")
    setRevSearchResults([])
    try {
      const data = await clientApi.get<Product[]>("/api/v1/products/")
      setRevAllProducts(data)
    } catch { }
    setRevisionOpen(true)
  }

  const revFilteredProducts = revSearchQuery
    ? revAllProducts.filter(p =>
        p.name.toLowerCase().includes(revSearchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(revSearchQuery.toLowerCase())
      )
    : []

  const revRecalc = useCallback(() => {
    const sub = revisedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const gst = revApplyGst ? Math.round(sub * 0.18 * 100) / 100 : 0
    const disc = revDiscount || 0
    return { subtotal: sub, gst, total: Math.max(0, sub + gst - disc), disc }
  }, [revisedItems, revDiscount, revApplyGst])

  const revOriginalTotal = revisionOrder?.total || 0
  const revCalc = revRecalc()
  const revPriceDiff = Math.round((revCalc.total - revOriginalTotal) * 100) / 100

  const handleRevQty = (productId: number, delta: number) => {
    setRevisedItems(prev => prev.map(i =>
      i.product_id === productId
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
    ))
  }

  const handleRevRemove = (productId: number) => {
    setRevisedItems(prev => prev.filter(i => i.product_id !== productId))
  }

  const handleRevAddProduct = (product: Product) => {
    setRevisedItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
      }]
    })
    setRevSearchQuery("")
    setRevSearchResults([])
  }

  const [leftoverAmount, setLeftoverAmount] = useState(0)
  const [revConfirmOpen, setRevConfirmOpen] = useState(false)
  const [revUnpackedOpen, setRevUnpackedOpen] = useState(false)
  const [revUnpackedName, setRevUnpackedName] = useState("")
  const [revUnpackedPrice, setRevUnpackedPrice] = useState<number | null>(null)

  const handleRevAddUnpacked = () => {
    if (revUnpackedPrice === null || !Number.isFinite(revUnpackedPrice) || revUnpackedPrice <= 0) {
      toast.error("Price is required and must be greater than 0")
      return
    }
    const product_id = -(Date.now() % 1000000000 + 1)
    const itemName = revUnpackedName.trim() || "Unpacked Product"
    setRevisedItems(prev => [...prev, {
      product_id,
      product_name: itemName,
      quantity: 1,
      unit_price: revUnpackedPrice,
    }])
    setRevUnpackedOpen(false)
    setRevUnpackedName("")
    setRevUnpackedPrice(null)
    toast.success(`${itemName} added to order`)
  }

  const handleUpdateOrder = async () => {
    if (!revisionOrder) return
    if (revisedItems.length === 0) {
      toast.error("Order must have at least one item")
      return
    }
    setRevConfirmOpen(false)
    setRevising(true)
    try {
      const resp = await fetch(`${API_URL}/api/v1/orders/${revisionOrder.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          status: "completed",
          revised_items: revisedItems.map(i => ({
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: Number(i.quantity) || 0,
            unit_price: Number(i.unit_price) || 0,
          })),
          discount: revDiscount,
          apply_gst: revApplyGst,
          revision_status: "Updated",
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || "Failed to update order")
      }
      await loadOrders()
      setRevisionOpen(false)
      toast.success("Order updated successfully")

      // Auto-download revised invoice
      try {
        const invoiceResp = await fetch(`${API_URL}/api/v1/invoices/generate/${revisionOrder.id}`, {
          method: "POST",
          headers: authHeaders(),
        })
        if (invoiceResp.ok) {
          const blob = await invoiceResp.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `invoice-${revisionOrder.id}-rev-${(revisionOrder.revision_number || 0) + 1}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        }
      } catch { /* silent fail on invoice download */ }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update order")
    } finally {
      setRevising(false)
    }
  }

  const currentOrders = tab === "b2c" ? b2cOrders : orders
  const filtered = getSortedFiltered(currentOrders)

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    if (sortDir === "asc") return <ChevronUp className="size-3 ml-0.5 inline" />
    if (sortDir === "desc") return <ChevronDown className="size-3 ml-0.5 inline" />
    return null
  }

  const getRevisionLabel = (order: Order) => {
    if (order.revision_status) return order.revision_status
    if (order.revision_number && order.revision_number > 0) return `Rev ${order.revision_number}`
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage, track, and revise completed orders</p>
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as OrderTab)} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="changed" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <History className="size-4 mr-1.5" />
              Changed Orders
            </TabsTrigger>
            <TabsTrigger value="b2c" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Store className="size-4 mr-1.5" />
              B2C Orders
              {b2cOrders.length > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                  {b2cOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

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

        <TabsContent value="changed" className="mt-4">
          {/* Changed Orders Table */}
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
                    <TableHead>Items</TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("total")}>
                      <div className="flex items-center gap-1">Total{renderSortIcon("total")}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">Status{renderSortIcon("status")}</div>
                    </TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("created_at")}>
                      <div className="flex items-center gap-1">Date{renderSortIcon("created_at")}</div>
                    </TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-16">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center size-12 rounded-xl bg-muted mb-2">
                            <Package className="size-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No changed orders found</p>
                          <p className="text-sm text-muted-foreground">
                            Completed orders that can be revised will appear here.
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
                                className={cn("text-xs font-normal px-2 py-0", ORDER_STATUS_CONFIG[order.status]?.color || "")}
                              >
                                {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getRevisionLabel(order) ? (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {getRevisionLabel(order)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenRevision(order)
                              }}
                              className="h-8 px-2.5 rounded-lg gap-1 text-xs"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedId === order.id && order.items && order.items.length > 0 && (
                          <TableRow key={`${order.id}-items`}>
                            <TableCell colSpan={9} className="bg-muted/20 p-0">
                              <div className="px-12 py-4 space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  Order Items ({order.items.length})
                                </p>
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
                                          ₹{Number((item as { total?: number }).total || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {order.revision_number && order.revision_number > 0 && (
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                                    <span>Previous: ₹{order.previous_total?.toFixed(2)}</span>
                                    {order.adjustment_total !== null && order.adjustment_total !== undefined && (
                                      <span className={order.adjustment_total >= 0 ? "text-green-600" : "text-red-600"}>
                                        Adjustment: {order.adjustment_total >= 0 ? "+" : ""}₹{order.adjustment_total.toFixed(2)}
                                      </span>
                                    )}
                                    {order.revision_status && (
                                      <span className="font-medium">{order.revision_status}</span>
                                    )}
                                  </div>
                                )}
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
        </TabsContent>

        <TabsContent value="b2c" className="mt-4">
          {/* B2C Orders Table (existing) */}
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
                    <TableHead>Items</TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("total")}>
                      <div className="flex items-center gap-1">Total{renderSortIcon("total")}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">Status{renderSortIcon("status")}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("created_at")}>
                      <div className="flex items-center gap-1">Date{renderSortIcon("created_at")}</div>
                    </TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-16">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center size-12 rounded-xl bg-muted mb-2">
                            <Package className="size-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No pending B2C orders</p>
                          <p className="text-sm text-muted-foreground">
                            Customer orders from the B2C shop will appear here.
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
                                className={cn("text-xs font-normal px-2 py-0", ORDER_STATUS_CONFIG[order.status]?.color || "")}
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
                          <TableCell>
                            {order.status === "pending" || order.status === "B2C-pending" ? (
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleApproveB2C(order) }}
                                  disabled={updating}
                                  className="h-8 px-3 rounded-lg gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="size-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleRejectB2C(order) }}
                                  disabled={updating}
                                  className="h-8 px-3 rounded-lg gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                >
                                  <XCircle className="size-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className={cn("text-xs font-normal", ORDER_STATUS_CONFIG[order.status]?.color || "")}>
                                {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex items-center justify-center size-7 rounded-md hover:bg-muted outline-none cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="size-3.5 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onSelect={() => router.push(`/orders?id=${order.id}`)}>
                                  <Eye className="size-3.5 mr-2" />View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(`/billing?order=${order.id}`)}>
                                  <FileText className="size-3.5 mr-2" />View Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {expandedId === order.id && order.items && order.items.length > 0 && (
                          <TableRow key={`${order.id}-items`}>
                            <TableCell colSpan={9} className="bg-muted/20 p-0">
                              <div className="px-12 py-4 space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Items ({order.items.length})</p>
                                <div className="space-y-1.5">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-background border">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="font-medium truncate">{item.product_name}</span>
                                        <span className="text-muted-foreground font-mono text-xs">{item.product_sku}</span>
                                      </div>
                                      <div className="flex items-center gap-4 shrink-0">
                                        <span className="text-muted-foreground">x{item.quantity}</span>
                                        <span className="text-muted-foreground">₹{Number((item as { unit_price?: number }).unit_price || 0).toFixed(2)}</span>
                                        <span className="font-medium w-20 text-right tabular-nums">₹{Number((item as { total?: number }).total || 0).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
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
        </TabsContent>
      </Tabs>

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
                <Badge variant="outline" className={cn("text-xs font-normal", ORDER_STATUS_CONFIG[selectedOrder?.status || "pending"]?.color || "")}>
                  {ORDER_STATUS_CONFIG[selectedOrder?.status || "pending"]?.label}
                </Badge>
                {pendingStatus && pendingStatus !== selectedOrder?.status && (
                  <>
                    <span className="text-muted-foreground text-sm">→</span>
                    <Badge variant="outline" className={cn("text-xs font-normal", ORDER_STATUS_CONFIG[pendingStatus]?.color || "")}>
                      {ORDER_STATUS_CONFIG[pendingStatus]?.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-lg" onClick={() => setDialogOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleStatusConfirm} disabled={updating} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg">
              {updating && <RefreshCw className="size-3.5 animate-spin" />}
              {updating ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* B2C Confirm Modal */}
      <Dialog open={b2cConfirmOpen} onOpenChange={(open) => { if (!b2cConfirming) setB2cConfirmOpen(open) }}>
        <DialogContent className="sm:max-w-2xl">
          {b2cConfirmed ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Order Completed</DialogTitle>
                    <DialogDescription>B2C order has been approved and completed successfully.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <Receipt className="size-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="font-semibold text-green-800 dark:text-green-300">{b2cConfirmOrder?.order_number}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">Receipt generated & inventory deducted</p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setB2cConfirmOpen(false); setB2cConfirmOrder(null); setB2cConfirmed(false) }}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white">Done</Button>
              </DialogFooter>
            </>
          ) : b2cConfirming ? (
            <>
              <DialogHeader>
                <DialogTitle>Processing Order...</DialogTitle>
                <DialogDescription>Approving order, deducting inventory, and generating receipt.</DialogDescription>
              </DialogHeader>
              <div className="text-center py-10">
                <Loader2 className="size-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Please wait while the order is being processed.</p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Edit & Confirm B2C Order</DialogTitle>
                <DialogDescription>Adjust items, add products, discount, or toggle GST before approving.</DialogDescription>
              </DialogHeader>
              <div className="bg-muted rounded-xl p-3 flex flex-wrap gap-x-6 gap-y-1 text-sm border">
                <div className="flex gap-1.5"><span className="text-muted-foreground">Order</span><span className="font-mono font-medium">{b2cConfirmOrder?.order_number}</span></div>
                <div className="flex gap-1.5"><span className="text-muted-foreground">Customer</span><span className="font-medium">{b2cConfirmOrder?.customer_name || "Walk-in"}</span></div>
                <div className="flex gap-1.5"><span className="text-muted-foreground">Payment</span><span className="font-medium capitalize">{b2cConfirmOrder?.payment_method === "credit" ? "Khata" : b2cConfirmOrder?.payment_method || "Online"}</span></div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search products to add..." value={editProductSearch} onChange={e => setEditProductSearch(e.target.value)}
                  className="pl-9 h-8 text-sm rounded-lg bg-muted/50 border-0" />
                {editProductSearch && editFilteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {editFilteredProducts.slice(0, 10).map(p => (
                      <button key={p.id} onClick={() => handleEditAddProduct(p)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku} · Stock: {p.stock_quantity}</p>
                        </div>
                        <span className="text-sm font-medium shrink-0 ml-2 tabular-nums">₹{p.selling_price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="max-h-[30vh] overflow-y-auto space-y-1.5">
                {editableItems.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">No items. Search and add products above.</div>
                ) : (
                  editableItems.map(item => (
                    <div key={item.product_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:text-foreground rounded-[4px]" onClick={() => handleEditQty(item.product_id, -1)}><Minus className="size-3" /></Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:text-foreground rounded-[4px]" onClick={() => handleEditQty(item.product_id, 1)}><Plus className="size-3" /></Button>
                      </div>
                      <p className="text-sm font-medium w-20 text-right tabular-nums">₹{(item.quantity * item.unit_price).toFixed(2)}</p>
                      <Button variant="ghost" size="icon-xs" className="size-6 text-destructive hover:text-destructive rounded-[4px]" onClick={() => handleEditRemove(item.product_id)}><Trash2 className="size-3" /></Button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-3 border-t pt-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Discount (₹)</p>
                  <Input type="number" min="0" step="0.01" value={editDiscount} onChange={e => setEditDiscount(parseFloat(e.target.value) || 0)} className="h-8 text-sm rounded-[4px] border-border" />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <span className="text-xs text-muted-foreground">GST</span>
                  <button type="button" onClick={() => setEditApplyGst(!editApplyGst)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editApplyGst ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${editApplyGst ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                  </button>
                </div>
              </div>
              {(() => { const { subtotal, gst, total, disc } = editRecalc(); return (
                <div className="space-y-1 text-sm border-t pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">₹{subtotal.toFixed(2)}</span></div>
                  {disc > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular-nums text-destructive">-₹{disc.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="tabular-nums">₹{gst.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Total</span><span className="tabular-nums">₹{total.toFixed(2)}</span></div>
                </div>
              )})()}
              <DialogFooter className="mt-2">
                <Button className="bg-red-600 hover:bg-red-700 text-white rounded-lg" onClick={() => { setB2cConfirmOpen(false); setB2cConfirmOrder(null) }} disabled={b2cConfirming}>Cancel</Button>
                <Button onClick={handleB2CConfirmSubmit} disabled={b2cConfirming || editableItems.length === 0}
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg">
                  <CheckCircle className="size-4" />{b2cConfirming ? "Processing..." : "Confirm & Complete"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Revision Modal --- */}
      <Dialog open={revisionOpen} onOpenChange={(open) => { if (!revising) setRevisionOpen(open) }}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#121214]">
          <DialogHeader>
            <DialogTitle>Edit — {revisionOrder?.order_number}</DialogTitle>
          </DialogHeader>

          {/* Order Header */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm bg-muted/50 rounded-[8px] p-4 border">
            <div className="text-muted-foreground">Status</div>
            <div><Badge variant="outline" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400">Updated</Badge></div>
            <div className="text-muted-foreground">Date</div>
            <div>{revisionOrder ? new Date(revisionOrder.created_at).toLocaleString("en-IN") : "—"}</div>
            <div className="text-muted-foreground">Customer</div>
            <div>{revisionOrder?.customer_name || "Walk-in"}</div>
            <div className="text-muted-foreground">Payment</div>
            <div className="capitalize">{revisionOrder?.payment_method || "—"}</div>
          </div>

          {/* Product search + Unpacked button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search products to add..." value={revSearchQuery} onChange={e => setRevSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm rounded-[6px] bg-muted/50 border-0" />
              {revSearchQuery && revFilteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border rounded-[8px] shadow-lg max-h-40 overflow-y-auto">
                  {revFilteredProducts.slice(0, 10).map(p => (
                    <button key={p.id} onClick={() => handleRevAddProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku} · Stock: {p.stock_quantity}</p>
                      </div>
                      <span className="text-sm font-medium shrink-0 ml-2 tabular-nums">₹{Number(p.selling_price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setRevUnpackedOpen(true)} className="h-8 rounded-[6px] gap-1 shrink-0">
              <Package className="size-3.5" />
              Unpacked
            </Button>
          </div>

          {/* Editable items */}
          <div className="max-h-[30vh] overflow-y-auto space-y-1.5">
            {revisedItems.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No items. Search and add products above.</div>
            ) : (
              revisedItems.map(item => (
                <div key={item.product_id} className="flex items-center justify-between gap-2 p-2.5 rounded-[8px] border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">₹{Number(item.unit_price).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:text-foreground rounded-[4px]" onClick={() => handleRevQty(item.product_id, -1)}><Minus className="size-3" /></Button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums">{Number(item.quantity)}</span>
                    <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:text-foreground rounded-[4px]" onClick={() => handleRevQty(item.product_id, 1)}><Plus className="size-3" /></Button>
                  </div>
                  <p className="text-sm font-medium w-20 text-right tabular-nums">₹{(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</p>
                  <Button variant="ghost" size="icon-xs" className="size-6 text-destructive hover:text-destructive rounded-[4px]" onClick={() => handleRevRemove(item.product_id)}><Trash2 className="size-3" /></Button>
                </div>
              ))
            )}
          </div>

          {/* Discount + GST */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">Discount (₹)</p>
              <Input type="number" min="0" step="0.01" value={revDiscount} onChange={e => setRevDiscount(parseFloat(e.target.value) || 0)} className="h-8 text-sm rounded-[6px] border-border" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <span className="text-xs text-muted-foreground">GST</span>
              <button type="button" onClick={() => setRevApplyGst(!revApplyGst)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${revApplyGst ? "bg-primary" : "bg-muted-foreground/30"}`}>
                <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${revApplyGst ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm bg-muted/30 rounded-[8px] p-3 border">
            <div className="flex justify-between text-muted-foreground">
              <span>Original Total</span>
              <span className="tabular-nums">₹{revOriginalTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{revCalc.subtotal.toFixed(2)}</span>
            </div>
            {revCalc.disc > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span className="tabular-nums">-₹{revCalc.disc.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>GST</span>
              <span className="tabular-nums">₹{revCalc.gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-1">
              <span>Grand Total</span>
              <span className="tabular-nums">₹{revCalc.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="font-medium">Difference</span>
              <span className={cn("tabular-nums font-medium", revPriceDiff >= 0 ? "text-green-600" : "text-red-600")}>
                {revPriceDiff >= 0 ? "+" : ""}₹{revPriceDiff.toFixed(2)}
              </span>
            </div>
          </div>

          {revPriceDiff > 0 && (
            <div className="rounded-[8px] border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                Price increased by ₹{revPriceDiff.toFixed(2)}. Adjustment invoice will be generated.
              </p>
            </div>
          )}
          {revPriceDiff < 0 && (
            <div className="rounded-[8px] border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3 text-sm">
              <p className="font-medium text-green-800 dark:text-green-300">
                Price decreased by ₹{Math.abs(revPriceDiff).toFixed(2)}. Inventory will be restored.
              </p>
            </div>
          )}

          <DialogFooter className="mt-2 gap-2">
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-[8px]" onClick={() => { setRevisionOpen(false); setRevisionOrder(null) }} disabled={revising}>
              Cancel
            </Button>
            <Button onClick={() => setRevConfirmOpen(true)} disabled={revising || revisedItems.length === 0}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[8px]">
              <CheckCircle className="size-4" />
              {revising ? "Updating..." : "Update Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Update Confirmation Dialog --- */}
      <Dialog open={revConfirmOpen} onOpenChange={setRevConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121214]">
          <DialogHeader>
            <DialogTitle>Confirm Update</DialogTitle>
            <DialogDescription>
              Updating this order will adjust inventory according to the quantity difference and generate a revised invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-[8px] p-4 space-y-1.5 text-sm border">
            <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-medium">{revisionOrder?.order_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Original</span><span className="tabular-nums">₹{revOriginalTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">New Total</span><span className="tabular-nums font-medium">₹{revCalc.total.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">Difference</span>
              <span className={cn("tabular-nums font-semibold", revPriceDiff >= 0 ? "text-green-600" : "text-red-600")}>
                {revPriceDiff >= 0 ? "+" : ""}₹{revPriceDiff.toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-[8px]" onClick={() => setRevConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateOrder} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[8px]">
              <CheckCircle className="size-4" />Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Unpacked Product Dialog --- */}
      <Dialog open={revUnpackedOpen} onOpenChange={setRevUnpackedOpen}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-[#121214]">
          <DialogHeader>
            <DialogTitle>Add Unpacked Product</DialogTitle>
            <DialogDescription>Add a custom line item. It won't affect inventory.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Name (optional)</label>
              <Input value={revUnpackedName} onChange={e => setRevUnpackedName(e.target.value)} className="rounded-[6px] border-border h-11" placeholder="Unpacked Product" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Price *</label>
              <Input type="number" min="0" step="0.01" value={revUnpackedPrice ?? ""}
                onChange={e => setRevUnpackedPrice(e.target.value === "" ? null : parseFloat(e.target.value))}
                className="rounded-[6px] border-border h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-[6px]" onClick={() => setRevUnpackedOpen(false)}>Cancel</Button>
            <Button onClick={handleRevAddUnpacked} disabled={!revUnpackedPrice || revUnpackedPrice <= 0} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[6px]">Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
