"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { CheckCircle, XCircle, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  payment_type: string
  status: string
  subtotal: number
  discount: number
  gst: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  items: B2COrderItem[]
}

const statusStyles: Record<string, string> = {
  online: "bg-blue-100 text-blue-800 border-blue-300",
  counter: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
}

const statusLabels: Record<string, string> = {
  online: "Online",
  counter: "Counter",
  completed: "Completed",
  cancelled: "Cancelled",
}

export default function B2COrderHistoryPage() {
  const [orders, setOrders] = useState<B2COrder[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi.get<B2COrder[]>("/api/v1/b2c/shopkeeper/order-history")
      setOrders(data)
    } catch (err) {
      console.error("Failed to load B2C order history", err)
      toast.error("Failed to load order history")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6 pb-8 bg-[#F8FAFC] min-h-screen">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">B2C Order History</h1>
          <div className="h-8 bg-slate-200 rounded-lg w-28 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse flex items-center px-6 gap-4">
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-16" />
              <div className="h-4 bg-slate-200 rounded w-20" />
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
        <h1 className="text-3xl font-bold text-slate-900">B2C Order History</h1>
        <Badge variant="outline" className="text-sm rounded-lg px-3 py-1 border-slate-200 text-slate-600">{orders.length} completed</Badge>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="size-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No completed B2C orders yet</p>
          <p className="text-slate-400 text-sm mt-1">Completed orders from customers will show up here.</p>
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
                <TableHead className="text-slate-500 font-medium">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
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
                    <div className="text-xs text-slate-400 mt-0.5">
                      {order.items?.slice(0, 2).map(i => i.product_name).join(", ")}
                      {(order.items?.length || 0) > 2 ? "..." : ""}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[order.status] || "bg-gray-100"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(order.updated_at).toLocaleDateString("en-IN")}
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