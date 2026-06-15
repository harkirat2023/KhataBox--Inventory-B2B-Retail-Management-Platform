"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, Plus, Minus, Trash2, Receipt, Barcode, QrCode, ScanBarcode } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QRScanner } from "@/components/ui/qr-scanner"
import { Product } from "@/types/product"
import { Order } from "@/types/order"
import { clientApi } from "@/lib/client-api"
import { useCartStore, CartItem } from "@/store/cart"

export default function BillingPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [scanInput, setScanInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<"search" | "qr">("search")
  const [lastScanned, setLastScanned] = useState<Product | null>(null)
  const [scannedQty, setScannedQty] = useState(1)

  const { items, discount, addItem, removeItem, updateQuantity, setDiscount, clearCart } = useCartStore()

  const loadProducts = useCallback(async () => {
    try {
      const data = await clientApi.get<Product[]>("/api/v1/products/")
      setProducts(data)
    } catch (err) {
      console.error("Failed to load products", err)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Handle QR scan - lookup by UUID and add to cart
  const handleQRScanned = useCallback(async (uuid: string) => {
    try {
      const product = await clientApi.get<Product>(`/api/v1/products/by-uuid/${uuid}`)
      setLastScanned(product)
      setScannedQty(1)
      toast.success(`Found: ${product.name}`)
    } catch (err) {
      console.error("Product not found", err)
      toast.error("Product not found with this QR code")
    }
  }, [])

  // Add scanned product to cart
  const handleAddScanned = () => {
    if (lastScanned) {
      addItem(
        {
          product_id: lastScanned.id,
          name: lastScanned.name,
          sku: lastScanned.sku,
          unit_price: lastScanned.selling_price,
        },
        scannedQty
      )
      setLastScanned(null)
      setScannedQty(1)
      toast.success("Added to cart")
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleScan = () => {
    const q = scanInput.trim().toLowerCase()
    if (!q) return
    const product = products.find(
      (p) => p.sku.toLowerCase() === q || p.name.toLowerCase() === q
    )
    if (product) {
      addItem({
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
    try {
      const order = await clientApi.post<Order>("/api/v1/orders/", {
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        discount,
      })
      toast.success(`Bill generated! Order ${order.order_number} created.`)
      clearCart()
      router.push("/orders")
    } catch (err) {
      console.error("Failed to create order", err)
      toast.error("Failed to generate bill. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const gst = subtotal * 0.18 // 18% GST
  const total = Math.max(0, subtotal + gst - discount)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Toggle between Search and QR Scan modes */}
          <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as "search" | "qr")}>
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1">
                <Search className="size-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex-1">
                <ScanBarcode className="size-4 mr-2" />
                Scan QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4 mt-4">
              <Card>
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
                      className="pl-10"
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
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={handleScan} variant="secondary">Lookup</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4 mt-4">
              <QRScanner
                onScan={handleQRScanned}
                onError={(err) => toast.error(err)}
              />

              {/* Last scanned product display */}
              {lastScanned && (
                <Card className="border-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Last Scanned</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lastScanned.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {lastScanned.sku} • ₹{lastScanned.selling_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          lastScanned.stock_quantity <= lastScanned.reorder_threshold
                            ? "text-destructive"
                            : ""
                        }`}>
                          Stock: {lastScanned.stock_quantity}
                        </p>
                        {lastScanned.stock_quantity <= lastScanned.reorder_threshold && (
                          <Badge variant="destructive" className="text-xs">
                            {lastScanned.stock_quantity === 0 ? "Out of Stock" : "Low Stock"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setScannedQty(Math.max(1, scannedQty - 1))}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">{scannedQty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setScannedQty(scannedQty + 1)}
                      >
                        <Plus className="size-4" />
                      </Button>
                      <Button onClick={handleAddScanned} className="flex-1">
                        <QrCode className="size-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <Card>
            <CardContent className="p-0">
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No products found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <span className={product.stock_quantity <= product.reorder_threshold ? "text-destructive font-medium" : ""}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell>₹{product.selling_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            addItem({
                              product_id: product.id,
                              name: product.name,
                              sku: product.sku,
                              unit_price: product.selling_price,
                            })
                          }
                        >
                          <Plus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No items in cart. Search and add products from the left.
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-6"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-6"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium w-20 text-right tabular-nums">
                        ₹{(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="size-6 text-destructive shrink-0"
                        onClick={() => removeItem(item.product_id)}
                      >
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
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 h-7 text-right text-sm"
                  />
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span className="font-medium tabular-nums">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between w-full font-semibold text-base">
                  <span>Total</span>
                  <span className="tabular-nums">₹{total.toFixed(2)}</span>
                </div>
              </CardFooter>
            )}
          </Card>

          {items.length > 0 && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerateBill}
              disabled={loading}
            >
              <Receipt className="size-4 mr-2" />
              {loading ? "Generating..." : "Generate Bill"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
