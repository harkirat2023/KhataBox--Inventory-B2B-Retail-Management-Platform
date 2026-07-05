"use client"

import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Truck,
  Shield,
  BarChart3,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Product } from "@/types/product"
import { clientApi } from "@/lib/client-api"

interface DemandForecast {
  product_id: number
  product_name: string
  current_stock: number
  total_sold_last_30_days: number
  predicted_demand: number
  recommended_order_qty: number
  confidence: number
}

const trendData = [
  { month: "Jan", sales: 120 },
  { month: "Feb", sales: 145 },
  { month: "Mar", sales: 110 },
  { month: "Apr", sales: 180 },
  { month: "May", sales: 200 },
  { month: "Jun", sales: 165 },
  { month: "Jul", sales: 190 },
  { month: "Aug", sales: 210 },
  { month: "Sep", sales: 195 },
  { month: "Oct", sales: 220 },
  { month: "Nov", sales: 240 },
  { month: "Dec", sales: 260 },
]

export default function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [forecast, setForecast] = useState<DemandForecast | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clientApi.get<Product[]>("/api/v1/products/").then(setProducts).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    clientApi
      .get<DemandForecast>(`/api/v1/forecasting/demand/${selectedId}`)
      .then(setForecast)
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const heroCards = forecast
    ? [
        {
          label: "Current Stock",
          value: forecast.current_stock,
          icon: Package,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Predicted Demand",
          value: forecast.predicted_demand,
          icon: TrendingUp,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          label: "Recommended Order Qty",
          value: forecast.recommended_order_qty,
          icon: Truck,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Confidence",
          value: `${forecast.confidence}%`,
          icon: Shield,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
      ]
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">AI Forecasting</h1>
        <p className="text-sm text-slate-500">
          Predict demand and optimize inventory with AI-powered insights.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Product</span>
        </div>
        <Select value={selectedId} onValueChange={(v) => v && setSelectedId(v)}>
          <SelectTrigger className="w-[280px] rounded-xl border-slate-200 h-11">
            <SelectValue placeholder="Select a product..." />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name} ({p.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {heroCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {heroCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <div className={`rounded-xl p-2 ${card.bg}`}>
                      <Icon className={`size-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!selectedId && !loading && (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <CardContent className="py-16 text-center p-0">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-slate-100 mb-4">
                <BarChart3 className="size-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">Select a product</p>
              <p className="text-sm text-slate-500 mt-1">Choose a product above to view demand forecast and trend analysis.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {forecast && (
        <>
          <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-slate-900">AI Restocking Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  Based on historical sales data, we recommend ordering{" "}
                  <span className="font-semibold text-slate-900">
                    {forecast.recommended_order_qty} units
                  </span>{" "}
                  of <span className="font-semibold text-slate-900">{forecast.product_name}</span>{" "}
                  to maintain optimal stock levels.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 w-full max-w-[200px] rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${forecast.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {forecast.confidence}% forecast accuracy
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-slate-900">Trend Chart</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "13px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
