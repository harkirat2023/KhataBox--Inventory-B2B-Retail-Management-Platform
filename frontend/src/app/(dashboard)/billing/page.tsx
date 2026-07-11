"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Search, Plus, Minus, Trash2, Receipt, Barcode, ScanBarcode, Download, ChevronLeft, ChevronRight, X, Package, CheckCircle2, CreditCard, Banknote, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QRScanner } from "@/components/ui/qr-scanner"
import { Product } from "@/types/product"
import { Order } from "@/types/order"
import { Customer } from "@/types/customer"
import { clientApi, authHeaders } from "@/lib/client-api"
import { useBillingStore } from "@/store/billing"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [scanInput, setScanInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<"search" | "qr">("search")
  const [lastScanned, setLastScanned] = useState<Product | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [applyGst, setApplyGst] = useState(true)
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [unpackedOpen, setUnpackedOpen] = useState(false)
  const [unpackedName, setUnpackedName] = useState("")
  const [unpackedPrice, setUnpackedPrice] = useState<number | null>(null)
  const [customerChangeModalOpen, setCustomerChangeModalOpen] = useState(false)
  const [pendingCustomerId, setPendingCustomerId] = useState<number | null>(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<"review" | "payment" | "success">("review")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [generating, setGenerating] = useState(false)

  const {
    carts,
    activeCartId,
    addNewCart,
    deleteCart,
    switchToCart,
    switchToNext,
    switchToPrev,
    addItemToActiveCart,
    removeItemFromActiveCart,
    updateQtyInActiveCart,
    setDiscountOnActiveCart,
    clearActiveCart,
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
    } catch (err) {
      console.error("Failed to load products", err)
    }
  }, [])

  const loadCustomers = useCallback(async () => {
    try {
      const data = await clientApi.get<Customer[]>("/api/v1/customers/")
      setCustomers(data)
    } catch (err) {
      console.error("Failed to load customers", err)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadCustomers() }, [loadCustomers])
  
  // Ensure activeCartId is valid after store hydration
  useEffect(() => {
    const state = useBillingStore.getState()
    if (!state.activeCartId || !state.carts.find(c => c.id === state.activeCartId)) {
      // If activeCartId is invalid, set it to the first cart
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
      addItemToActiveCart(
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: product.selling_price,
        },
        1
      )
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      console.error("Product lookup failed", err)
      toast.error(err instanceof Error ? err.message : "Product not found")
    }
  }, [addItemToActiveCart])

  const stockMap = new Map(products.map((p) => [p.id, p.stock_quantity]))
  const getCartQty = (productId: number) =>
    items.find((i) => i.product_id === productId)?.quantity || 0

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleScan = () => {
    const q = scanInput.trim().toLowerCase()
    if (!q) return
    const product = products.find(
      (p) => p.sku.toLowerCase() === q || p.name.toLowerCase() === q
    )
    if (product) {
      const maxStock = stockMap.get(product.id) ?? Infinity
      const currentQty = getCartQty(product.id)
      if (currentQty + 1 > maxStock) {
        toast.error(`"${product.name}" is out of stock`)
        return
      }
      addItemToActiveCart({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
      })
      setScanInput("")
    }
  }

  const handleAddUnpackedToCart = () => {
    if (unpackedPrice === null || !Number.isFinite(unpackedPrice) || unpackedPrice <= 0) {
      toast.error("Price is required and must be greater than 0")
      return
    }

    const product_id = -(Date.now() % 1000000000 + 1)
    const itemName = unpackedName.trim() || "Unpacked Product"

    addItemToActiveCart(
      {
        product_id,
        name: itemName,
        sku: "UNPACKED",
        unit_price: unpackedPrice,
      },
      1
    )

    setUnpackedOpen(false)
    setUnpackedName("")
    setUnpackedPrice(null)
    toast.success(`${itemName} added to cart`)
  }

  const handleGenerateBill = async () => {
    if (items.length === 0) return
    setLoading(true)
    setLastOrderId(null)
    try {
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        discount,
        customer_id: selectedCustomerId || null,
        payment_method: selectedCustomerId ? "credit" : "cash",
      }
      if (!applyGst) {
        payload["apply_gst"] = false
      }

      const order = await clientApi.post<Order>("/api/v1/orders/", payload)
      setLastOrderId(order.id)
      toast.success(`Bill generated! Order ${order.order_number} created.`)

      if (order.credit_alert) {
        const { customer_name, credit_used, credit_limit, exceeded_by } = order.credit_alert
        toast.warning(
          `${customer_name}: Credit limit exceeded by ₹${exceeded_by.toFixed(2)}! Used ₹${credit_used.toFixed(2)} of ₹{credit_limit.toFixed(2)}`,
          { duration: 8000 }
        )
      } else if (selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId)
        if (customer) {
          toast.success(`${customer.company_name || customer.contact_person || "Customer"} khata updated`)
        }
      }

      // Don't clear cart immediately, let user download or skip
    } catch (err: unknown) {
      console.error("Failed to create order", err)
      toast.error(err instanceof Error ? err.message : "Failed to generate bill.")
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Clear current cart and create new empty cart
    clearActiveCart()
    setLastOrderId(null)
    setSelectedCustomerId(null)
    toast.success("Ready for new order")
  }

  const handleDownloadInvoice = async () => {
    if (!lastOrderId) return
    setDownloading(true)
    try {
      const resp = await fetch(`${API_URL}/api/v1/invoices/generate/${lastOrderId}`, {
        method: "POST",
        headers: authHeaders(),
      })
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

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const gst = applyGst ? subtotal * 0.18 : 0
  const total = Math.max(0, subtotal + gst - discount)

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
  const creditRemaining = selectedCustomer
    ? (selectedCustomer.credit_limit - selectedCustomer.credit_used)
    : 0

  return (
    <div className="space-y-6 bg-background">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Create bills and manage orders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Scan & Unpacked buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={scannerActive ? "default" : "outline"}
              className="rounded-[6px] h-11 px-5"
              onClick={() => setScannerActive(!scannerActive)}
            >
              <ScanBarcode className="size-4 mr-2" />
              {scannerActive ? "Hide Scanner" : "Scan Product"}
            </Button>
            <Button
              variant="outline"
              className="rounded-[6px] h-11 px-5"
              onClick={() => setUnpackedOpen(true)}
            >
              <Package className="size-4 mr-2" />
              Unpacked Product
            </Button>
          </div>
          {scannerActive && (
            <div className="max-w-md">
              <QRScanner
                onScan={handleQRScanned}
                onError={handleScannerError}
              />
            </div>
          )}
          {lastScanned && (
            <Card className="rounded-[8px] border border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-base">Last Scanned</CardTitle>
                <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-[6px]" onClick={() => setLastScanned(null)}>
                  <X className="size-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{lastScanned.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {lastScanned.sku} &bull; ₹{lastScanned.selling_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${lastScanned.stock_quantity <= lastScanned.reorder_threshold ? "text-red-600" : ""}`}>
                      Stock: {lastScanned.stock_quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In cart: {getCartQty(lastScanned.id)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="bg-card border border-border text-foreground hover:bg-muted rounded-[6px]" onClick={() => {
                    const currentQty = getCartQty(lastScanned.id)
                    if (currentQty <= 1) {
                      removeItemFromActiveCart(lastScanned.id)
                    } else {
                      updateQtyInActiveCart(lastScanned.id, currentQty - 1)
                    }
                  }}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{getCartQty(lastScanned.id)}</span>
                  <Button variant="outline" size="icon" className="bg-card border border-border text-foreground hover:bg-muted rounded-[6px]" onClick={() => {
                    const maxStock = stockMap.get(lastScanned.id) ?? Infinity
                    const currentQty = getCartQty(lastScanned.id)
                    if (currentQty + 1 > maxStock) {
                      toast.error(`Only ${maxStock} of "${lastScanned.name}" available`)
                      return
                    }
                    addItemToActiveCart(
                      {
                        product_id: lastScanned.id,
                        name: lastScanned.name,
                        sku: lastScanned.sku,
                        unit_price: lastScanned.selling_price,
                      },
                      1
                    )
                  }}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Products Section */}
          <Card className="rounded-[8px] border border-border shadow-sm">
            <CardHeader>
              <CardTitle>Search Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  inputMode="search"
                  className="rounded-[6px] bg-muted border-0 h-11 pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Scan / enter SKU or name..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    inputMode="search"
                    className="rounded-[6px] bg-muted border-0 h-11 pl-10"
                  />
                </div>
                <Button onClick={handleScan} className="bg-card border border-border text-foreground hover:bg-muted rounded-[6px] h-11 px-5">Lookup</Button>
              </div>
            </CardContent>
          </Card>

          <div className="bg-card rounded-[8px] border border-border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="size-10 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">No products found</p>
                        <p className="text-sm text-muted-foreground">Try a different search term or scan a QR code</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{product.sku}</TableCell>
                    <TableCell>
                      <span className={product.stock_quantity <= product.reorder_threshold ? "text-red-600 font-medium" : ""}>
                        {product.stock_quantity}
                      </span>
                    </TableCell>
                    <TableCell>₹{product.selling_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-[6px]"
                        onClick={() => {
                          const maxStock = stockMap.get(product.id) ?? Infinity
                          const currentQty = getCartQty(product.id)
                          if (currentQty + 1 > maxStock) {
                            toast.error(`Only ${maxStock - currentQty} more of "${product.name}" available in stock`)
                            return
                          }
                          addItemToActiveCart({
                            product_id: product.id,
                            name: product.name,
                            sku: product.sku,
                            unit_price: product.selling_price,
                          })
                        }}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Cart — moved to top */}
          <Card className="rounded-[8px] border border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Cart</CardTitle>
                <div className="flex items-center gap-1">
                  {navigableCount > 1 && (
                    <>
                      <Button variant="outline" size="icon-xs" className="size-7 bg-card border border-border text-foreground hover:bg-muted rounded-[6px]" onClick={switchToPrev} title="Previous cart">
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground min-w-[4rem] text-center tabular-nums">
                        {activeIdx + 1} of {navigableCount}
                      </span>
                      <Button variant="outline" size="icon-xs" className="size-7 bg-card border border-border text-foreground hover:bg-muted rounded-[6px]" onClick={switchToNext} title="Next cart">
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon-xs" className="size-7 text-destructive hover:bg-accent hover:text-destructive rounded-[6px]" onClick={() => {
                    if (items.length === 0) {
                      toast.error("Cart is already empty")
                      return
                    }
                    const cartId = useBillingStore.getState().activeCartId
                    if (!cartId) return
                    deleteCart(cartId)
                    const current = useBillingStore.getState().carts
                    const remaining = current.filter(c => c.id !== cartId && (c.status === "active" || c.status === "incomplete"))
                    if (remaining.length > 0) {
                      switchToCart(remaining[0].id)
                    } else {
                      addNewCart()
                    }
                    toast.success("Cart deleted")
                  }} title="Delete current cart">
                    <Trash2 className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" className="size-7 text-primary hover:bg-accent hover:text-primary rounded-[6px]" onClick={() => {
                    if (items.length === 0) {
                      toast.error("Add items to the current cart first")
                      return
                    }
                    addNewCart()
                  }} title="New cart">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              {activeCart && (
                <p className="text-xs text-muted-foreground mt-1">{activeCart.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Receipt className="size-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Cart is empty</p>
                  <p className="text-sm text-muted-foreground">Search or scan products to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-[6px]" onClick={() => { if (item.quantity - 1 <= 0) { removeItemFromActiveCart(item.product_id); return }; updateQtyInActiveCart(item.product_id, item.quantity - 1); }}>
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-[6px]" onClick={() => {
                          const maxStock = stockMap.get(item.product_id) ?? Infinity
                          if (item.quantity + 1 > maxStock) {
                            toast.error(`Only ${maxStock} of "${item.name}" available in stock`)
                            return
                          }
                          updateQtyInActiveCart(item.product_id, item.quantity + 1)
                        }}>
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium w-20 text-right tabular-nums">
                        ₹{(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                      <Button variant="ghost" size="icon-xs" className="size-6 text-destructive hover:bg-accent hover:text-destructive rounded-[6px] shrink-0" onClick={() => {
                        if (item.quantity <= 1) {
                          removeItemFromActiveCart(item.product_id)
                        } else {
                          updateQtyInActiveCart(item.product_id, item.quantity - 1)
                        }
                      }}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {items.length > 0 && (
              <CardFooter className="flex-col gap-3">
                <div className="flex items-center justify-between w-full text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscountOnActiveCart(parseFloat(e.target.value) || 0)}
                    inputMode="decimal"
                    className="w-24 h-7 text-right text-sm rounded-[6px] border-border"
                  />
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <button
                      type="button"
                      onClick={() => setApplyGst(!applyGst)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${applyGst ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${applyGst ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                  </div>
                  <span className="font-medium tabular-nums">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between w-full font-semibold text-base border-t border-border pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">₹{total.toFixed(2)}</span>
                </div>
              </CardFooter>
            )}
          </Card>

          {/* Khata Customer — with gradient accent */}
          <Card className="rounded-[8px] border-0 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500" />
            <CardContent className="space-y-3 pl-5 pt-5">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="size-2 rounded-full bg-gradient-to-b from-blue-500 to-purple-500 inline-block" />
                Khata Customer
              </CardTitle>
              <Select
                value={selectedCustomerId ? String(selectedCustomerId) : ""}
                onValueChange={(val) => {
                  const newCustomerId = val ? parseInt(val) : null
                  // If cart has items and trying to change customer, show modal
                  if (newCustomerId !== selectedCustomerId && items.length > 0 && selectedCustomerId !== null) {
                    setPendingCustomerId(newCustomerId)
                    setCustomerChangeModalOpen(true)
                  } else {
                    setSelectedCustomerId(newCustomerId)
                  }
                }}
              >
                <SelectTrigger className="rounded-[6px] border-border h-11">
                  <SelectValue>
                    {selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId)?.company_name || customers.find(c => c.id === selectedCustomerId)?.contact_person || `Customer #${selectedCustomerId}`) : "Walk-in (no khata)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Walk-in (no khata)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name || c.contact_person || c.email || `Customer #${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="text-xs space-y-1 bg-muted border border-border p-3 rounded-[6px]">
                  <p>Limit: <span className="font-medium">₹{selectedCustomer.credit_limit.toFixed(2)}</span></p>
                  <p>Used: <span className="font-medium">₹{selectedCustomer.credit_used.toFixed(2)}</span></p>
                  <p>Remaining: <span className={`font-medium ${creditRemaining < 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{creditRemaining.toFixed(2)}
                  </span></p>
                  {total > 0 && creditRemaining - total < 0 && (
                    <p className="text-red-600 font-medium text-xs mt-1">
                      Bill exceeds remaining credit by ₹{Math.abs(creditRemaining - total).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {items.length > 0 && !lastOrderId && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] h-11 px-5 transition-all duration-200"
              onClick={() => {
                setPaymentMethod(selectedCustomerId ? "credit" : "cash")
                setCheckoutStep("review")
                setCheckoutOpen(true)
              }}
            >
              <Receipt className="size-4 mr-2" />
              Generate Bill
            </Button>
          )}

          {incompleteCarts.length > 0 && (
            <Card className="rounded-[8px] border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incompleteCarts.map((cart) => {
                  const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
                  return (
                    <div key={cart.id} className="flex items-center justify-between gap-2 bg-muted border border-border p-3 rounded-[6px] text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{cart.name}</p>
                        <p className="text-xs text-muted-foreground">{cart.items.length} item{cart.items.length !== 1 ? "s" : ""} &bull; ₹{cartTotal.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(cart.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase text-amber-600 font-medium px-1.5 py-0.5 bg-amber-50 rounded-lg">Incomplete</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:bg-accent hover:text-foreground/80 rounded-[6px]" onClick={() => switchToCart(cart.id)} title="Switch to this cart">
                          <ChevronRight className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-destructive hover:bg-accent hover:text-destructive rounded-[6px]" onClick={() => deleteCart(cart.id)} title="Delete cart">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={unpackedOpen} onOpenChange={setUnpackedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Unpacked Product</DialogTitle>
            <DialogDescription>
              Add a custom line item to the billing cart.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Name (optional)</label>
              <Input value={unpackedName} onChange={(e) => setUnpackedName(e.target.value)} className="rounded-[6px] border-border h-11" inputMode="text" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Price *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unpackedPrice ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  setUnpackedPrice(v === "" ? null : parseFloat(v))
                }}
                className="rounded-[6px] border-border h-11"
                inputMode="decimal"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-[6px]" onClick={() => setUnpackedOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px]" onClick={handleAddUnpackedToCart}>
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Change Modal */}
      <Dialog open={customerChangeModalOpen} onOpenChange={setCustomerChangeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Customer?</DialogTitle>
            <DialogDescription>
              The current cart has items. Changing the customer will require a new cart.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-[6px]" onClick={() => {
              setCustomerChangeModalOpen(false)
              setPendingCustomerId(null)
            }}>
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px]" onClick={() => {
              if (pendingCustomerId !== null) {
                setSelectedCustomerId(pendingCustomerId)
              }
              addNewCart()
              setCustomerChangeModalOpen(false)
              setPendingCustomerId(null)
              toast.success("New cart created with selected customer")
            }}>
              Add New Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single-step Checkout Modal — Editable Preview + Atomic Confirm */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => { if (!generating) setCheckoutOpen(open) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {generating ? "Generating Bill..." : "Review & Confirm Bill"}
            </DialogTitle>
            <DialogDescription>
              {generating ? "Creating order and generating invoice..." : "Edit items, select payment, then confirm to generate."}
            </DialogDescription>
          </DialogHeader>

          {generating ? (
            <div className="text-center py-10">
              <Loader2 className="size-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Processing order, updating inventory, and generating invoice...</p>
            </div>
          ) : (
            <>
              {/* Editable Items */}
              <div className="max-h-[40vh] overflow-y-auto space-y-1.5 py-2">
                {items.map((item) => {
                  const maxStock = stockMap.get(item.product_id) ?? Infinity
                  return (
                    <div key={item.product_id} className="flex items-center justify-between gap-2 p-2 rounded-[6px] border border-border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:text-foreground rounded-[4px]" onClick={() => {
                          if (item.quantity - 1 <= 0) { removeItemFromActiveCart(item.product_id); return }
                          updateQtyInActiveCart(item.product_id, item.quantity - 1)
                        }}>
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-muted-foreground hover:text-foreground rounded-[4px]" onClick={() => {
                          if (item.quantity + 1 > maxStock) {
                            toast.error(`Only ${maxStock} of "${item.name}" available`)
                            return
                          }
                          updateQtyInActiveCart(item.product_id, item.quantity + 1)
                        }}>
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium w-20 text-right tabular-nums">₹{(item.unit_price * item.quantity).toFixed(2)}</p>
                      <Button variant="ghost" size="icon-xs" className="size-6 text-destructive hover:text-destructive rounded-[4px]" onClick={() => removeItemFromActiveCart(item.product_id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {items.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No items in cart. Close and add products.
                </div>
              )}

              {/* Payment Method + Discount + Totals */}
              <div className="space-y-3 border-t border-border pt-3 mt-1">
                {/* Payment Method Selection */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Payment Method</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { value: "cash", label: "Cash", icon: Banknote },
                      { value: "upi", label: "UPI", icon: CreditCard },
                      { value: "credit", label: "Khata", icon: Receipt },
                      { value: "bank_transfer", label: "Bank", icon: CreditCard },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-[6px] text-xs font-medium transition-all border ${
                          paymentMethod === value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount + GST Toggle */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Discount (₹)</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscountOnActiveCart(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm rounded-[4px] border-border"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <span className="text-xs text-muted-foreground">GST</span>
                    <button
                      type="button"
                      onClick={() => setApplyGst(!applyGst)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${applyGst ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${applyGst ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                  </div>
                </div>

                {/* Customer Credit Info */}
                {selectedCustomer && (
                  <div className="text-xs bg-muted rounded-[6px] p-2.5 border border-border">
                    <p className="font-medium text-foreground">{selectedCustomer.company_name || selectedCustomer.contact_person}</p>
                    <p className="text-muted-foreground">Credit remaining: <span className={creditRemaining < total ? "text-destructive font-medium" : ""}>₹{Math.max(0, creditRemaining).toFixed(2)}</span></p>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="tabular-nums text-destructive">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span className="tabular-nums">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t border-border pt-1">
                    <span>Total</span>
                    <span className="tabular-nums">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-3">
                <Button variant="outline" className="rounded-[6px]" disabled={generating} onClick={() => setCheckoutOpen(false)}>Cancel</Button>
                <Button
                  className="rounded-[6px]"
                  disabled={generating || items.length === 0}
                  onClick={async () => {
                    setGenerating(true)
                    try {
                      const payload: Record<string, unknown> = {
                        items: items.map((i) => ({
                          product_id: i.product_id,
                          product_name: i.name,
                          quantity: i.quantity,
                          unit_price: i.unit_price,
                        })),
                        discount,
                        customer_id: selectedCustomerId || null,
                        payment_method: paymentMethod,
                      }
                      if (!applyGst) payload["apply_gst"] = false

                      const order = await clientApi.post<Order>("/api/v1/orders/", payload)

                      // Success — download invoice, clear cart, refresh
                      toast.success(`Bill generated! ${order.order_number}`)

                      if (order.credit_alert) {
                        const { customer_name, credit_used, credit_limit, exceeded_by } = order.credit_alert
                        toast.warning(`${customer_name}: Credit exceeded by ₹${exceeded_by.toFixed(2)}`, { duration: 8000 })
                      } else if (selectedCustomerId) {
                        toast.success("Khata updated")
                      }

                      // Auto-download invoice
                      try {
                        const resp = await fetch(`${API_URL}/api/v1/invoices/generate/${order.id}`, {
                          method: "POST",
                          headers: authHeaders(),
                        })
                        if (resp.ok) {
                          const blob = await resp.blob()
                          const url = URL.createObjectURL(blob)
                          const link = document.createElement("a")
                          link.href = url
                          link.download = `invoice_${order.order_number}.pdf`
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                          URL.revokeObjectURL(url)
                        } else {
                          const text = await resp.text()
                          console.error("Invoice download failed:", resp.status, text)
                        }
                      } catch (invoiceErr) {
                        console.error("Invoice download error:", invoiceErr)
                        // Non-fatal — user can download from order history
                      }

                      // Clear state
                      setCheckoutOpen(false)
                      clearActiveCart()
                      setLastOrderId(null)
                      setSelectedCustomerId(null)
                      loadProducts()
                      toast.success("Ready for next order")
                    } catch (err: unknown) {
                      // Failure — do NOT clear cart, do NOT update inventory
                      console.error("Order creation failed:", err)
                      let msg = "Failed to generate bill"
                      if (err instanceof TypeError && err.message === "Failed to fetch") {
                        msg = `Cannot reach server at ${API_URL}/api/v1/orders/. Is the backend running?`
                      } else if (err instanceof Error) {
                        msg = err.message
                      }
                      toast.error(msg)
                    } finally {
                      setGenerating(false)
                    }
                  }}
                >
                  {generating ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Receipt className="size-4 mr-2" /> Confirm Bill</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
