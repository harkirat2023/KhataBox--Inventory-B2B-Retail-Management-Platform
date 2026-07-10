"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Search, Plus, Minus, Trash2, Receipt, Barcode, ScanBarcode,
  Download, ChevronLeft, ChevronRight, X, Package, Check, CreditCard,
  Banknote, Smartphone, Loader2, ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { QRScanner } from "@/components/ui/qr-scanner"
import { Product } from "@/types/product"
import { Order } from "@/types/order"
import { Customer } from "@/types/customer"
import { clientApi } from "@/lib/client-api"
import { useBillingStore } from "@/store/billing"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

type ModalStep = "confirm" | "payment" | "done"

const paymentOptions = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit", label: "Credit (Khata)", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
]

function StepIndicator({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center size-7 rounded-[4px] text-xs font-bold font-mono transition-colors",
            i < step ? "bg-amber-brand/20 text-amber-brand" : i === step ? "bg-amber-brand text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          )}>
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </div>
          <span className={cn("text-xs font-medium hidden sm:inline", i === step ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400")}>
            {s}
          </span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />}
        </div>
      ))}
    </div>
  )
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [scanInput, setScanInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<Product | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [applyGst, setApplyGst] = useState(true)
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [unpackedOpen, setUnpackedOpen] = useState(false)
  const [unpackedName, setUnpackedName] = useState("")
  const [unpackedPrice, setUnpackedPrice] = useState<number | null>(null)
  const [customerChangeModalOpen, setCustomerChangeModalOpen] = useState(false)
  const [pendingCustomerId, setPendingCustomerId] = useState<number | null>(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<ModalStep>("confirm")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [creatingOrder, setCreatingOrder] = useState(false)

  const {
    carts, activeCartId, addNewCart, deleteCart, switchToCart,
    switchToNext, switchToPrev, addItemToActiveCart, removeItemFromActiveCart,
    updateQtyInActiveCart, setDiscountOnActiveCart, clearActiveCart,
  } = useBillingStore()

  const activeCart = carts.find(c => c.id === activeCartId)
  const items = activeCart?.items || []
  const discount = activeCart?.discount || 0
  const incompleteCarts = carts.filter(c => c.status === "incomplete")
  const navigableCount = carts.filter(c => c.status === "active" || c.status === "incomplete").length
  const activeIdx = (() => {
    const navigable = carts.filter(c => c.status === "active" || c.status === "incomplete")
    return navigable.findIndex(c => c.id === activeCartId)
  })()

  const loadProducts = useCallback(async () => {
    try {
      const data = await clientApi.get<Product[]>("/api/v1/products/")
      setProducts(data)
    } catch (err) { console.error("Failed to load products", err) }
  }, [])

  const loadCustomers = useCallback(async () => {
    try {
      const data = await clientApi.get<Customer[]>("/api/v1/customers/")
      setCustomers(data)
    } catch (err) { console.error("Failed to load customers", err) }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadCustomers() }, [loadCustomers])

  useEffect(() => {
    const state = useBillingStore.getState()
    if (!state.activeCartId || !state.carts.find(c => c.id === state.activeCartId)) {
      if (state.carts.length > 0) {
        useBillingStore.setState({ activeCartId: state.carts[0].id })
      }
    }
  }, [])

  const handleScannerError = useCallback((err: string) => toast.error(err), [])

  const handleQRScanned = useCallback(async (uuid: string) => {
    try {
      const product = await clientApi.get<Product>(`/api/v1/products/by-uuid/${uuid}`)
      setLastScanned(product)
      toast.success(`Found: ${product.name}`)
      const state = useBillingStore.getState()
      const activeItems = state.carts.find(c => c.id === state.activeCartId)?.items || []
      const currentQty = activeItems.find(i => i.product_id === product.id)?.quantity || 0
      if (currentQty + 1 > product.stock_quantity) {
        toast.error(`Only ${product.stock_quantity - currentQty} more of "${product.name}" available in stock`)
        return
      }
      addItemToActiveCart({ product_id: product.id, name: product.name, sku: product.sku, unit_price: product.selling_price }, 1)
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Product not found")
    }
  }, [addItemToActiveCart])

  const stockMap = new Map(products.map((p) => [p.id, p.stock_quantity]))
  const getCartQty = (productId: number) => items.find((i) => i.product_id === productId)?.quantity || 0

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleScan = () => {
    const q = scanInput.trim().toLowerCase()
    if (!q) return
    const product = products.find((p) => p.sku.toLowerCase() === q || p.name.toLowerCase() === q)
    if (product) {
      const maxStock = stockMap.get(product.id) ?? Infinity
      const currentQty = getCartQty(product.id)
      if (currentQty + 1 > maxStock) {
        toast.error(`"${product.name}" is out of stock`)
        return
      }
      addItemToActiveCart({ product_id: product.id, name: product.name, sku: product.sku, unit_price: product.selling_price })
      setScanInput("")
    }
  }

  const handleAddUnpackedToCart = () => {
    if (unpackedPrice === null || !Number.isFinite(unpackedPrice) || unpackedPrice <= 0) {
      toast.error("Price is required and must be greater than 0")
      return
    }
    addItemToActiveCart({ product_id: -Date.now(), name: unpackedName.trim() || "Unpacked Product", sku: "UNPACKED", unit_price: unpackedPrice }, 1)
    setUnpackedOpen(false)
    setUnpackedName("")
    setUnpackedPrice(null)
    toast.success(`${unpackedName.trim() || "Unpacked Product"} added to cart`)
  }

  const openCheckoutModal = () => {
    setModalStep("confirm")
    setPaymentMethod(selectedCustomerId ? "credit" : "cash")
    setModalOpen(true)
  }

  const handleCreateOrder = async () => {
    setCreatingOrder(true)
    try {
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({ product_id: i.product_id, product_name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
        discount,
        customer_id: selectedCustomerId || null,
        payment_method: paymentMethod,
      }
      if (!applyGst) payload["apply_gst"] = false

      const order = await clientApi.post<Order>("/api/v1/orders/", payload)
      setLastOrderId(order.id)
      setLastOrderNumber(order.order_number)
      toast.success(`Order ${order.order_number} created!`)

      if (order.credit_alert) {
        const { customer_name, credit_used, credit_limit, exceeded_by } = order.credit_alert
        toast.warning(`${customer_name}: Credit limit exceeded by ₹${exceeded_by.toFixed(2)}!`, { duration: 8000 })
      } else if (selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId)
        if (customer) toast.success(`${customer.company_name || customer.contact_person || "Customer"} khata updated`)
      }

      setModalStep("done")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create order.")
    } finally {
      setCreatingOrder(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!lastOrderId) return
    setDownloading(true)
    try {
      const resp = await fetch(`${API_URL}/api/v1/invoices/generate/${lastOrderId}`, { method: "POST" })
      if (!resp.ok) throw new Error("Download failed")
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `invoice_${lastOrderId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("Invoice downloaded")
    } catch {
      toast.error("Failed to download invoice")
    } finally {
      setDownloading(false)
    }
  }

  const handleFinishCheckout = () => {
    clearActiveCart()
    setLastOrderId(null)
    setLastOrderNumber(null)
    setSelectedCustomerId(null)
    setModalOpen(false)
    setModalStep("confirm")
    toast.success("Ready for new order")
  }

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const gst = applyGst ? subtotal * 0.18 : 0
  const total = Math.max(0, subtotal + gst - discount)

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
  const creditRemaining = selectedCustomer ? (selectedCustomer.credit_limit - selectedCustomer.credit_used) : 0

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Billing</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Create bills and manage orders</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-[3px]">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main - Product Search & Scan */}
          <div className="lg:col-span-2 space-y-5">
            {/* Scan & Unpacked buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant={scannerActive ? "default" : "secondary"}
                size="sm"
                className={cn("rounded-[4px]", scannerActive && "bg-amber-brand text-white")}
                onClick={() => setScannerActive(!scannerActive)}
              >
                <ScanBarcode className="size-4 mr-1.5" />
                {scannerActive ? "Hide Scanner" : "Scan QR"}
              </Button>
              <Button variant="secondary" size="sm" className="rounded-[4px]" onClick={() => setUnpackedOpen(true)}>
                <Package className="size-4 mr-1.5" />
                Unpacked
              </Button>
            </div>

            {scannerActive && (
              <div className="max-w-md">
                <QRScanner onScan={handleQRScanned} onError={handleScannerError} />
              </div>
            )}

            {lastScanned && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{lastScanned.name}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">SKU: {lastScanned.sku} &middot; &₹;{lastScanned.selling_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-mono", lastScanned.stock_quantity <= lastScanned.reorder_threshold ? "text-red-600" : "text-zinc-500")}>
                      Stock: {lastScanned.stock_quantity}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">In cart: {getCartQty(lastScanned.id)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="icon-sm" className="rounded-[4px]" onClick={() => {
                    const q = getCartQty(lastScanned.id)
                    q <= 1 ? removeItemFromActiveCart(lastScanned.id) : updateQtyInActiveCart(lastScanned.id, q - 1)
                  }}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-10 text-center text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">{getCartQty(lastScanned.id)}</span>
                  <Button variant="secondary" size="icon-sm" className="rounded-[4px]" onClick={() => {
                    const max = stockMap.get(lastScanned.id) ?? Infinity
                    const q = getCartQty(lastScanned.id)
                    if (q + 1 > max) { toast.error(`Only ${max} of "${lastScanned.name}" available`); return }
                    addItemToActiveCart({ product_id: lastScanned.id, name: lastScanned.name, sku: lastScanned.sku, unit_price: lastScanned.selling_price }, 1)
                  }}>
                    <Plus className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="rounded-[4px] text-zinc-400 ml-auto" onClick={() => setLastScanned(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="size-4 text-zinc-400 shrink-0" />
                <Input
                  placeholder="Search by name, SKU, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  inputMode="search"
                  className="border-0 bg-zinc-50 dark:bg-zinc-800 h-9 rounded-[4px] text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Barcode className="size-4 text-zinc-400 shrink-0" />
                <Input
                  placeholder="Scan / enter SKU..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  inputMode="search"
                  className="border-0 bg-zinc-50 dark:bg-zinc-800 h-9 rounded-[4px] text-sm font-mono"
                />
                <Button onClick={handleScan} variant="secondary" size="sm" className="rounded-[4px] shrink-0">Lookup</Button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Product</TableHead>
                    <TableHead className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">SKU</TableHead>
                    <TableHead className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Stock</TableHead>
                    <TableHead className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Price</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-1">
                          <Search className="size-8 text-zinc-300" />
                          <p className="text-sm text-zinc-500">No products found</p>
                          <p className="text-xs text-zinc-400">Try a different search term</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((product) => (
                    <TableRow key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{product.name}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-500">{product.sku}</TableCell>
                      <TableCell>
                        <span className={cn("font-mono text-xs", product.stock_quantity <= product.reorder_threshold ? "text-red-600 font-medium" : "text-zinc-500")}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-zinc-900 dark:text-zinc-100">₹{product.selling_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" className="rounded-[4px] text-zinc-400" onClick={() => {
                          const max = stockMap.get(product.id) ?? Infinity
                          const q = getCartQty(product.id)
                          if (q + 1 > max) { toast.error(`Only ${max - q} more of "${product.name}" available`); return }
                          addItemToActiveCart({ product_id: product.id, name: product.name, sku: product.sku, unit_price: product.selling_price })
                        }}>
                          <Plus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Right Column - Cart & Customer */}
          <div className="space-y-5">
            {/* Cart Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px]">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="size-4 text-amber-brand" />
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cart</h2>
                    {activeCart && <span className="text-[10px] text-zinc-400 font-mono">{activeCart.name}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {navigableCount > 1 && (
                      <>
                        <Button variant="ghost" size="icon-xs" className="size-6 rounded-[3px] text-zinc-400" onClick={switchToPrev}>
                          <ChevronLeft className="size-3.5" />
                        </Button>
                        <span className="text-[10px] text-zinc-400 font-mono w-8 text-center">{activeIdx + 1}/{navigableCount}</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 rounded-[3px] text-zinc-400" onClick={switchToNext}>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon-xs" className="size-6 rounded-[3px] text-red-400 hover:text-red-600" onClick={() => {
                      if (items.length === 0) { toast.error("Cart is already empty"); return }
                      const cartId = useBillingStore.getState().activeCartId
                      if (!cartId) return
                      deleteCart(cartId)
                      const remaining = useBillingStore.getState().carts.filter(c => c.status === "active" || c.status === "incomplete")
                      remaining.length > 0 ? switchToCart(remaining[0].id) : addNewCart()
                    }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" className="size-6 rounded-[3px] text-zinc-400" onClick={() => {
                      if (items.length === 0) { toast.error("Add items first"); return }
                      addNewCart()
                    }}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Receipt className="size-8 text-zinc-300" />
                    <p className="text-sm text-zinc-500">Cart is empty</p>
                    <p className="text-xs text-zinc-400">Search or scan products</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">₹{item.unit_price.toFixed(2)} ea</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" className="size-5 rounded-[3px] text-zinc-400" onClick={() => {
                          if (item.quantity - 1 <= 0) { removeItemFromActiveCart(item.product_id); return }
                          updateQtyInActiveCart(item.product_id, item.quantity - 1)
                        }}>
                          <Minus className="size-2.5" />
                        </Button>
                        <span className="w-6 text-center text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">{item.quantity}</span>
                        <Button variant="ghost" size="icon-xs" className="size-5 rounded-[3px] text-zinc-400" onClick={() => {
                          const max = stockMap.get(item.product_id) ?? Infinity
                          if (item.quantity + 1 > max) { toast.error(`Only ${max} of "${item.name}" available`); return }
                          updateQtyInActiveCart(item.product_id, item.quantity + 1)
                        }}>
                          <Plus className="size-2.5" />
                        </Button>
                      </div>
                      <span className="text-xs font-mono font-medium w-16 text-right text-zinc-900 dark:text-zinc-100">
                        ₹{(item.unit_price * item.quantity).toFixed(2)}
                      </span>
                      <Button variant="ghost" size="icon-xs" className="size-5 rounded-[3px] text-zinc-400 hover:text-red-500 shrink-0" onClick={() => {
                        if (item.quantity <= 1) removeItemFromActiveCart(item.product_id)
                        else updateQtyInActiveCart(item.product_id, item.quantity - 1)
                      }}>
                        <Trash2 className="size-2.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Discount</span>
                    <Input type="number" min="0" step="0.01" value={discount}
                      onChange={(e) => setDiscountOnActiveCart(parseFloat(e.target.value) || 0)}
                      inputMode="decimal" className="w-20 h-6 text-xs text-right rounded-[3px] border-zinc-200 dark:border-zinc-700 font-mono" />
                  </div>
                  <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Subtotal</span><span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">₹{subtotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">GST (18%)</span>
                      <button type="button" onClick={() => setApplyGst(!applyGst)}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${applyGst ? "bg-amber-brand" : "bg-zinc-300 dark:bg-zinc-600"}`}>
                        <span className={`inline-block size-3 rounded-full bg-white transition-transform ${applyGst ? "translate-x-[14px]" : "translate-x-[1px]"}`} />
                      </button>
                    </div>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold border-t border-zinc-100 dark:border-zinc-800 pt-2">
                    <span className="text-zinc-900 dark:text-zinc-100">Total</span>
                    <span className="font-mono text-amber-brand">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Khata Customer */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-4">
              <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Khata Customer</h3>
              <Select value={selectedCustomerId ? String(selectedCustomerId) : ""} onValueChange={(val) => {
                const newId = val ? parseInt(val) : null
                if (newId !== selectedCustomerId && items.length > 0 && selectedCustomerId !== null) {
                  setPendingCustomerId(newId)
                  setCustomerChangeModalOpen(true)
                } else setSelectedCustomerId(newId)
              }}>
                <SelectTrigger className="w-full h-9 text-sm rounded-[4px] border-zinc-200 dark:border-zinc-700 font-mono">
                  <SelectValue>{selectedCustomerId && selectedCustomer ? (selectedCustomer.company_name || selectedCustomer.contact_person || `#${selectedCustomerId}`) : "Walk-in (no khata)"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Walk-in (no khata)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.company_name || c.contact_person || c.email || `#${c.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="mt-2 text-[10px] space-y-0.5 font-mono text-zinc-500">
                  <p>Limit: ₹{selectedCustomer.credit_limit.toFixed(2)}</p>
                  <p>Used: ₹{selectedCustomer.credit_used.toFixed(2)}</p>
                  <p>Remaining: <span className={creditRemaining < 0 ? "text-red-600" : "text-emerald-600"}>&#8377;{creditRemaining.toFixed(2)}</span></p>
                  {total > 0 && creditRemaining - total < 0 && (
                    <p className="text-red-600 font-medium mt-1">Exceeds credit by ₹{Math.abs(creditRemaining - total).toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Generate Bill Button - opens modal */}
            {items.length > 0 && !modalOpen && (
              <Button className="w-full bg-amber-brand hover:bg-amber-brand/90 text-white rounded-[4px] h-10 text-sm font-semibold"
                onClick={openCheckoutModal}>
                <Receipt className="size-4 mr-2" />
                Generate Bill
              </Button>
            )}

            {/* Incomplete Orders */}
            {incompleteCarts.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-4">
                <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Orders</h3>
                <div className="space-y-2">
                  {incompleteCarts.map((cart) => {
                    const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
                    return (
                      <div key={cart.id} className="flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-[3px] p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{cart.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{cart.items.length} item{cart.items.length !== 1 ? "s" : ""} &middot; ₹{cartTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] uppercase text-amber-600 font-medium px-1 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-[2px]">Incomplete</span>
                          <Button variant="ghost" size="icon-xs" className="size-5 rounded-[3px] text-zinc-400" onClick={() => switchToCart(cart.id)}>
                            <ChevronRight className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" className="size-5 rounded-[3px] text-zinc-400 hover:text-red-500" onClick={() => deleteCart(cart.id)}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-step Checkout Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (modalStep !== "done") return
              handleFinishCheckout()
            }}
          >
            <motion.div
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] w-full max-w-lg mx-4 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {modalStep === "confirm" && "Review Order"}
                    {modalStep === "payment" && "Payment Method"}
                    {modalStep === "done" && "Order Created"}
                  </h2>
                  {modalStep !== "done" && (
                    <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <StepIndicator
                  step={modalStep === "confirm" ? 0 : modalStep === "payment" ? 1 : 2}
                  steps={["Review", "Payment", "Done"]}
                />
              </div>

              {/* Body */}
              <div className="p-5">
                {modalStep === "confirm" && (
                  <div className="space-y-4">
                    <div className="max-h-[240px] overflow-y-auto space-y-2">
                      {items.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between text-sm">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{item.quantity} &times; ₹{item.unit_price.toFixed(2)}</p>
                          </div>
                          <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100 shrink-0">
                            ₹{(item.unit_price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-1 text-sm">
                      <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span className="font-mono">₹{subtotal.toFixed(2)}</span></div>
                      {discount > 0 && <div className="flex justify-between text-zinc-500"><span>Discount</span><span className="font-mono">-₹{discount.toFixed(2)}</span></div>}
                      {applyGst && <div className="flex justify-between text-zinc-500"><span>GST (18%)</span><span className="font-mono">₹{gst.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <span>Total</span><span className="font-mono text-amber-brand">₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                    {selectedCustomer && (
                      <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded-[3px] p-2">
                        Khata: {selectedCustomer.company_name || selectedCustomer.contact_person}
                        {creditRemaining - total < 0 && <span className="text-red-500 ml-1">(⚠ exceeds limit)</span>}
                      </div>
                    )}
                  </div>
                )}

                {modalStep === "payment" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500 mb-3">Select payment method</p>
                    {paymentOptions.map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentMethod(opt.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-[4px] border text-left transition-all",
                            paymentMethod === opt.value
                              ? "border-amber-brand/40 bg-amber-brand/5"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                          )}
                        >
                          <Icon className={cn("size-5", paymentMethod === opt.value ? "text-amber-brand" : "text-zinc-400")} />
                          <span className={cn("text-sm font-medium", paymentMethod === opt.value ? "text-amber-brand" : "text-zinc-700 dark:text-zinc-300")}>
                            {opt.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {modalStep === "done" && (
                  <motion.div
                    className="flex flex-col items-center py-8 text-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className="flex items-center justify-center size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                      <Check className="size-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">Order Created!</h3>
                    <p className="text-sm text-zinc-500 font-mono mb-1">
                      {lastOrderNumber ? `#${lastOrderNumber}` : `ID: ${lastOrderId}`}
                    </p>
                    <p className="text-xs text-zinc-400">Total: ₹{total.toFixed(2)} via {paymentMethod}</p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                {modalStep === "confirm" && (
                  <>
                    <Button variant="secondary" size="sm" className="rounded-[4px]" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button size="sm" className="bg-amber-brand hover:bg-amber-brand/90 text-white rounded-[4px]" onClick={() => setModalStep("payment")}>
                      Next: Payment {">"}
                    </Button>
                  </>
                )}
                {modalStep === "payment" && (
                  <>
                    <Button variant="secondary" size="sm" className="rounded-[4px]" onClick={() => setModalStep("confirm")}>
                      {"<"} Back
                    </Button>
                    <Button size="sm" className="bg-amber-brand hover:bg-amber-brand/90 text-white rounded-[4px]" onClick={handleCreateOrder} disabled={creatingOrder}>
                      {creatingOrder ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Creating...</> : "Confirm & Create"}
                    </Button>
                  </>
                )}
                {modalStep === "done" && (
                  <>
                    <Button variant="secondary" size="sm" className="rounded-[4px]" onClick={handleFinishCheckout}>
                      New Order
                    </Button>
                    <Button size="sm" className="bg-amber-brand hover:bg-amber-brand/90 text-white rounded-[4px]" onClick={handleDownloadInvoice} disabled={downloading}>
                      {downloading ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Downloading</> : <><Download className="size-3.5 mr-1.5" /> Download Invoice</>}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unpacked Product Dialog */}
      <Dialog open={unpackedOpen} onOpenChange={setUnpackedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Unpacked Product</DialogTitle>
            <DialogDescription>Add a custom line item to the billing cart.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Name (optional)</label>
              <Input value={unpackedName} onChange={(e) => setUnpackedName(e.target.value)} className="rounded-[4px] h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Price *</label>
              <Input type="number" min="0" step="0.01" value={unpackedPrice ?? ""}
                onChange={(e) => setUnpackedPrice(e.target.value === "" ? null : parseFloat(e.target.value))}
                className="rounded-[4px] h-9 text-sm" inputMode="decimal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" className="rounded-[4px]" onClick={() => setUnpackedOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-amber-brand hover:bg-amber-brand/90 text-white rounded-[4px]" onClick={handleAddUnpackedToCart}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Change Dialog */}
      <Dialog open={customerChangeModalOpen} onOpenChange={setCustomerChangeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Customer?</DialogTitle>
            <DialogDescription>The current cart has items. Changing the customer will require a new cart.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" className="rounded-[4px]" onClick={() => { setCustomerChangeModalOpen(false); setPendingCustomerId(null) }}>Cancel</Button>
            <Button size="sm" className="bg-amber-brand hover:bg-amber-brand/90 text-white rounded-[4px]" onClick={() => {
              if (pendingCustomerId !== null) setSelectedCustomerId(pendingCustomerId)
              addNewCart()
              setCustomerChangeModalOpen(false)
              setPendingCustomerId(null)
              toast.success("New cart created with selected customer")
            }}>Add New Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
