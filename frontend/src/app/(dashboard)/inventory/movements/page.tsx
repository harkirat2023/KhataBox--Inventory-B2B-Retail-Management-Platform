"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { clientApi } from "@/lib/client-api"
import { Store } from "@/types/store"

type MovementType = "sale" | "purchase" | "adjustment" | "return" | "transfer_in" | "transfer_out"

interface InventoryMovement {
  id: number
  product_id: number
  product_name: string
  product_sku: string
  store_id: number | null
  store_name: string | null
  movement_type: string
  quantity: number
  reference: string
  notes: string
  created_at: string
}

const typeConfig: Record<string, { label: string; class: string }> = {
  sale: { label: "Sale", class: "bg-red-100 text-red-800 border-red-300" },
  purchase: { label: "Purchase", class: "bg-green-100 text-green-800 border-green-300" },
  adjustment: { label: "Adjustment", class: "bg-amber-100 text-amber-800 border-amber-300" },
  return: { label: "Return", class: "bg-blue-100 text-blue-800 border-blue-300" },
  transfer_in: { label: "Transfer In", class: "bg-purple-100 text-purple-800 border-purple-300" },
  transfer_out: { label: "Transfer Out", class: "bg-orange-100 text-orange-800 border-orange-300" },
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const loadMovements = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (storeFilter && storeFilter !== "all") params.set("store_id", storeFilter)
      const qs = params.toString()
      const data = await clientApi.get<InventoryMovement[]>(`/api/v1/inventory/movements/${qs ? `?${qs}` : ""}`)
      setMovements(data)
    } catch (err) {
      console.error("Failed to load movements", err)
    } finally {
      setLoading(false)
    }
  }, [storeFilter])

  const loadStores = useCallback(async () => {
    try {
      setStores(await clientApi.get<Store[]>("/api/v1/stores/"))
    } catch {}
  }, [])

  useEffect(() => { loadMovements() }, [loadMovements])
  useEffect(() => { loadStores() }, [loadStores])

  const filtered = movements.filter((m) => {
    const matchesSearch =
      m.product_name.toLowerCase().includes(search.toLowerCase()) ||
      m.product_sku.toLowerCase().includes(search.toLowerCase()) ||
      m.reference.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || m.movement_type === typeFilter
    const date = new Date(m.created_at)
    const matchesFrom = !dateFrom || date >= new Date(dateFrom)
    const matchesTo = !dateTo || date <= new Date(dateTo + "T23:59:59")
    return matchesSearch && matchesType && matchesFrom && matchesTo
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory Movements</h1>
        <p className="text-sm text-muted-foreground">Track all stock changes across your inventory</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search product, SKU, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl bg-muted border-0 h-11 pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
          <SelectTrigger className="w-[140px] rounded-xl border-border h-11">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="transfer_in">Transfer In</SelectItem>
            <SelectItem value="transfer_out">Transfer Out</SelectItem>
          </SelectContent>
        </Select>
        <Select value={storeFilter} onValueChange={(val) => val && setStoreFilter(val)}>
          <SelectTrigger className="w-[180px] rounded-xl border-border h-11">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px] rounded-xl border-border h-11"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px] rounded-xl border-border h-11"
          placeholder="To"
        />
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      ) : (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center size-12 rounded-xl bg-muted mb-4">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No movements found</p>
                    <p className="text-sm text-muted-foreground mt-1">No inventory movements match your current filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="font-medium">{movement.product_name}</TableCell>
                <TableCell className="font-mono text-sm">{movement.product_sku}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs px-2 py-0 ${(typeConfig[movement.movement_type]?.class) || "bg-gray-100 text-gray-800 border-gray-300"}`}>
                    {typeConfig[movement.movement_type]?.label || movement.movement_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{movement.store_name || "—"}</TableCell>
                <TableCell className={movement.quantity < 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                  {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{movement.reference || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(movement.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  )
}
