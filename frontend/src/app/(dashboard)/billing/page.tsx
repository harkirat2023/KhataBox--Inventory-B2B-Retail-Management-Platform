"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Search, Plus, Minus, Trash2, Receipt, Barcode, ScanBarcode, Download, ChevronLeft, ChevronRight, X } from "lucide-react"
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
import { clientApi, getToken } from "@/lib/client-api"
import { useBillingStore } from "@/store/billing"

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
          `${customer_name}: Credit limit exceeded by ₹${exceeded_by.toFixed(2)}! Used ₹${credit_used.toFixed(2)} of ₹${credit_limit.toFixed(2)}`,
          { duration: 8000 }
        )
      } else if (selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId)
        if (customer) {
          toast.success(`${customer.company_name || customer.contact_person || "Customer"} khata updated`)
        }
      }

      clearActiveCart()
    } catch (err: unknown) {
      console.error("Failed to create order", err)
      toast.error(err instanceof Error ? err.message : "Failed to generate bill.")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!lastOrderId) return
    setDownloading(true)
    try {
      const token = await getToken()
      const resp = await fetch(`${API_URL}/api/v1/invoices/generate/${lastOrderId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    <div className="space-y-6 bg-[#F8FAFC]">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Create bills and manage orders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as "search" | "qr")}>
            <TabsList className="w-full bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="search" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Search className="size-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ScanBarcode className="size-4 mr-2" />
                Scan QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4 mt-4">
              <Card className="rounded-2xl border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Search Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, SKU, or category..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="rounded-xl bg-slate-50 border-0 h-11 pl-10"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        placeholder="Scan / enter SKU or name..."
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleScan()}
                        className="rounded-xl bg-slate-50 border-0 h-11 pl-10"
                      />
                    </div>
                    <Button onClick={handleScan} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5">Lookup</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4 mt-4">
              <QRScanner
                onScan={handleQRScanned}
                onError={handleScannerError}
              />
              {lastScanned && (
                <Card className="rounded-2xl border border-blue-200 bg-blue-50/30 shadow-sm">
                  <CardHeader className="pb-3 flex-row items-center justify-between">
                    <CardTitle className="text-base">Last Scanned</CardTitle>
                    <Button variant="ghost" size="icon-xs" className="size-6 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl" onClick={() => setLastScanned(null)}>
                      <X className="size-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lastScanned.name}</p>
                        <p className="text-sm text-slate-500">
                          SKU: {lastScanned.sku} &bull; ₹{lastScanned.selling_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${lastScanned.stock_quantity <= lastScanned.reorder_threshold ? "text-red-600" : ""}`}>
                          Stock: {lastScanned.stock_quantity}
                        </p>
                        <p className="text-xs text-slate-500">
                          In cart: {getCartQty(lastScanned.id)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => {
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
                      <Button variant="outline" size="icon" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => {
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
            </TabsContent>
          </Tabs>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                        <Search className="size-10 text-slate-300" />
                        <p className="text-sm font-medium text-slate-900">No products found</p>
                        <p className="text-sm text-slate-500">Try a different search term or scan a QR code</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-500">{product.sku}</TableCell>
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
                        className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl"
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
          {/* Customer Selector (Khata) */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Khata Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selectedCustomerId ? String(selectedCustomerId) : ""}
                onValueChange={(val) => setSelectedCustomerId(val ? parseInt(val) : null)}
              >
                <SelectTrigger className="rounded-xl border-slate-200 h-11">
                  <SelectValue placeholder="Walk-in (no khata)" />
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
                <div className="text-xs space-y-1 bg-slate-50 border border-slate-200 p-3 rounded-xl">
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

          <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Cart</CardTitle>
                <div className="flex items-center gap-1">
                  {navigableCount > 1 && (
                    <>
                      <Button variant="outline" size="icon-xs" className="size-7 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl" onClick={switchToPrev} title="Previous cart">
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <span className="text-xs text-slate-500 min-w-[4rem] text-center tabular-nums">
                        {activeIdx + 1} of {navigableCount}
                      </span>
                      <Button variant="outline" size="icon-xs" className="size-7 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl" onClick={switchToNext} title="Next cart">
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon-xs" className="size-7 text-red-600 hover:bg-slate-100 hover:text-red-700 rounded-xl" onClick={() => {
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
                  <Button variant="ghost" size="icon-xs" className="size-7 text-blue-600 hover:bg-slate-100 hover:text-blue-700 rounded-xl" onClick={() => {
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
                <p className="text-xs text-slate-500 mt-1">{activeCart.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Receipt className="size-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-900">Cart is empty</p>
                  <p className="text-sm text-slate-500">Search or scan products to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">₹{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" className="size-6 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl" onClick={() => { if (item.quantity - 1 <= 0) { removeItemFromActiveCart(item.product_id); return }; updateQtyInActiveCart(item.product_id, item.quantity - 1); }}>
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl" onClick={() => {
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
                      <Button variant="ghost" size="icon-xs" className="size-6 text-red-600 hover:bg-slate-100 hover:text-red-700 rounded-xl shrink-0" onClick={() => {
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
                  <span className="text-slate-500">Discount</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscountOnActiveCart(parseFloat(e.target.value) || 0)}
                    className="w-24 h-7 text-right text-sm rounded-xl border-slate-200"
                  />
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">GST (18%)</span>
                    <button
                      type="button"
                      onClick={() => setApplyGst(!applyGst)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${applyGst ? "bg-blue-600" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${applyGst ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                  </div>
                  <span className="font-medium tabular-nums">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between w-full font-semibold text-base border-t border-slate-200 pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">₹{total.toFixed(2)}</span>
                </div>
              </CardFooter>
            )}
          </Card>

          {items.length > 0 && !lastOrderId && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 transition-all duration-200"
              onClick={handleGenerateBill}
              disabled={loading}
            >
              <Receipt className="size-4 mr-2" />
              {loading ? "Generating..." : "Generate Bill"}
            </Button>
          )}

          {lastOrderId && (
            <Button
              className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5"
              onClick={handleDownloadInvoice}
              disabled={downloading}
            >
              <Download className="size-4 mr-2" />
              {downloading ? "Downloading..." : "Download Invoice"}
            </Button>
          )}

          {/* ORDERS Section */}
          {incompleteCarts.length > 0 && (
            <Card className="rounded-2xl border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incompleteCarts.map((cart) => {
                  const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
                  return (
                    <div key={cart.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{cart.name}</p>
                        <p className="text-xs text-slate-500">{cart.items.length} item{cart.items.length !== 1 ? "s" : ""} &bull; ₹{cartTotal.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-500">{new Date(cart.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase text-amber-600 font-medium px-1.5 py-0.5 bg-amber-50 rounded-lg">Incomplete</span>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl" onClick={() => switchToCart(cart.id)} title="Switch to this cart">
                          <ChevronRight className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" className="size-6 text-red-600 hover:bg-slate-100 hover:text-red-700 rounded-xl" onClick={() => deleteCart(cart.id)} title="Delete cart">
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
    </div>
  )
}
