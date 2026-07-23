"use client"

import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Truck,
  Shield,
  BarChart3,
  Store,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Calendar,
  Award,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Product } from "@/types/product"
import { clientApi } from "@/lib/client-api"
import { useStoreContext } from "@/lib/store-context"
import { toast } from "sonner"

interface DemandForecast {
  product_id: number
  product_name: string
  category: string | null
  current_stock: number
  total_sold_last_30_days: number
  total_sold_prev_30_days: number
  predicted_demand: number
  recommended_order_qty: number
  confidence_score: number
  seasonality_factor: number
  trend: string
  category_avg_monthly: number
  store_id: number | null
}

interface DailySalesPoint {
  date: string
  quantity: number
  revenue: number
}

interface SalesHistory {
  product_id: number
  product_name: string
  daily_sales: DailySalesPoint[]
  monthly_avg: number
  peak_month: string
  low_month: string
  trend: string
  mom_change_pct: number
}

interface ChartPoint {
  month: string
  actual: number | null
  predicted: number | null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [forecast, setForecast] = useState<DemandForecast | null>(null)
  const [salesHistory, setSalesHistory] = useState<SalesHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const { activeStore } = useStoreContext()

  useEffect(() => {
    const url = activeStore?.id ? `/api/v1/products/?store_id=${activeStore.id}` : "/api/v1/products/"
    clientApi.get<Product[]>(url).then(setProducts).catch(console.error)
  }, [activeStore])

  const buildChartData = useCallback((history: SalesHistory, fc: DemandForecast) => {
    if (!history.daily_sales.length) return []

    const now = new Date()
    const monthlyMap: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthlyMap[key] = 0
    }

    for (const day of history.daily_sales) {
      const d = new Date(day.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (key in monthlyMap) {
        monthlyMap[key] += day.quantity
      }
    }

    const months = Object.keys(monthlyMap).sort()
    const nowMonth = now.getMonth()
    const nowYear = now.getFullYear()

    return months.map((key, i) => {
      const [y, m] = key.split("-").map(Number)
      const monthIdx = m - 1
      const isFuture = y > nowYear || (y === nowYear && monthIdx > nowMonth)
      const isCurrent = y === nowYear && monthIdx === nowMonth
      const avgMonthly = Math.max(1, Math.round(fc.predicted_demand / 2))
      const predictedVal = isFuture || isCurrent
        ? Math.round(fc.predicted_demand / 2 * (1 + (i - 2) * fc.seasonality_factor * 0.1))
        : null

      return {
        month: MONTHS[monthIdx],
        actual: isFuture ? null : monthlyMap[key],
        predicted: predictedVal,
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setForecast(null)
    setSalesHistory(null)

    Promise.allSettled([
      clientApi.get<DemandForecast>(`/api/v1/forecasting/demand/${selectedId}`),
      clientApi.get<SalesHistory>(`/api/v1/forecasting/demand/${selectedId}/sales-history`),
    ]).then(([fcRes, histRes]) => {
      let fc: DemandForecast | null = null
      let history: SalesHistory | null = null
      if (fcRes.status === "fulfilled") {
        fc = fcRes.value
        setForecast(fc)
      } else {
        const msg = fcRes.reason?.message || "Unknown error"
        console.error("Forecast API error:", fcRes.reason)
        toast.error(`Forecast: ${msg}`)
      }
      if (histRes.status === "fulfilled") {
        history = histRes.value
        setSalesHistory(history)
      } else {
        const msg = histRes.reason?.message || "Unknown error"
        console.error("Sales history API error:", histRes.reason)
        toast.error(`Sales history: ${msg}`)
      }
      if (fc && history) {
        setChartData(buildChartData(history, fc))
      }
      setLoading(false)
    })
  }, [selectedId, buildChartData])

  const storeFiltered = activeStore?.id
    ? products.filter((p) => p.store_id === activeStore.id)
    : products

  const momDirection = salesHistory
    ? salesHistory.mom_change_pct > 0 ? "up"
      : salesHistory.mom_change_pct < 0 ? "down" : "flat"
    : "flat"

  const TrendIcon = forecast?.trend === "up" ? ArrowUp
    : forecast?.trend === "down" ? ArrowDown : Minus

  const trendColor = forecast?.trend === "up" ? "text-emerald-600"
    : forecast?.trend === "down" ? "text-red-600" : "text-muted-foreground"

  const cardMeta = forecast
    ? [
        {
          label: "30-Day Sales",
          value: forecast.total_sold_last_30_days,
          sub: `Prev 30d: ${forecast.total_sold_prev_30_days}`,
          icon: ShoppingCart,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Predicted Demand",
          value: forecast.predicted_demand,
          sub: `${forecast.recommended_order_qty > 0 ? `Order ${forecast.recommended_order_qty}` : "Stock sufficient"}`,
          icon: TrendingUp,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          label: "Avg Monthly Sales",
          value: salesHistory?.monthly_avg ?? "—",
          sub: `Cat. avg: ${forecast.category_avg_monthly}`,
          icon: BarChart3,
          color: "text-cyan-600",
          bg: "bg-cyan-50",
        },
        {
          label: "Confidence",
          value: `${forecast.confidence_score}%`,
          sub: `Trend: ${forecast.trend}`,
          icon: Shield,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
      ]
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Forecasting</h1>
          <p className="text-sm text-muted-foreground">
            Predict demand and optimize inventory with AI-powered insights.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-9 px-4 w-full sm:w-auto"
          onClick={async () => {
            setRetraining(true)
            try {
              await clientApi.post("/api/v1/forecasting/ml/retrain", {})
              toast.success("Model retrained on latest sales data")
            } catch {
              toast.error("Retrain failed")
            } finally {
              setRetraining(false)
            }
          }}
          disabled={retraining}
        >
          <RefreshCw className={`size-4 mr-2 ${retraining ? "animate-spin" : ""}`} />
          {retraining ? "Training..." : "Retrain Model"}
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">Product</span>
        </div>
        <Select value={selectedId} onValueChange={(v) => v && setSelectedId(v)}>
          <SelectTrigger className="w-[280px] rounded-xl border-border h-11">
            <SelectValue placeholder="Select a product..." />
          </SelectTrigger>
          <SelectContent>
            {storeFiltered.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {activeStore?.id ? "No products in this store" : "No products found"}
              </div>
            )}
            {storeFiltered.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name || `Product #${p.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeStore?.id && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Store className="size-3" />
            {activeStore.name}
          </div>
        )}
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

      {!selectedId && !loading && (
        <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <CardContent className="py-16 text-center p-0">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-muted mb-4">
                <BarChart3 className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Select a product</p>
              <p className="text-sm text-muted-foreground mt-1">Choose a product above to view demand forecast and trend analysis.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {forecast && cardMeta && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cardMeta.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.label} className="bg-card rounded-2xl border border-border shadow-sm p-5">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <div className={`rounded-xl p-2 ${card.bg}`}>
                        <Icon className={`size-4 ${card.color}`} />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <TrendIcon className={`size-5 ${trendColor}`} />
                  Trend: {forecast.trend.charAt(0).toUpperCase() + forecast.trend.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">MoM Change</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    momDirection === "up" ? "text-emerald-600"
                    : momDirection === "down" ? "text-red-600"
                    : "text-muted-foreground"
                  }`}>
                    {momDirection === "up" ? <ArrowUp className="size-3" />
                      : momDirection === "down" ? <ArrowDown className="size-3" />
                      : <Minus className="size-3" />}
                    {Math.abs(salesHistory?.mom_change_pct ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Peak Month</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Award className="size-3 text-amber-500" />
                    {salesHistory?.peak_month || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Low Month</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground" />
                    {salesHistory?.low_month || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Category Avg</span>
                  <span className="font-medium text-foreground">
                    {forecast.category_avg_monthly} / month
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stock vs Need</span>
                  <span className="font-medium text-foreground">
                    {forecast.current_stock >= forecast.predicted_demand
                      ? "Stock sufficient"
                      : `Short by ${forecast.predicted_demand - forecast.current_stock}`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Package className="size-5 text-primary" />
                  AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    Based on analysis of <strong className="text-foreground">{salesHistory?.daily_sales.length || 0} days</strong> of sales data,
                    we recommend ordering{" "}
                    <span className="font-semibold text-foreground">
                      {forecast.recommended_order_qty} units
                    </span>{" "}
                    of <span className="font-semibold text-foreground">{forecast.product_name}</span>
                    {forecast.recommended_order_qty > 0
                      ? " to maintain optimal stock levels."
                      : " — current stock is sufficient."}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 w-full max-w-[200px] rounded-full bg-muted-foreground/20">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${forecast.confidence_score}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {forecast.confidence_score}% confidence
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-lg text-xs">
                    Seasonality: {forecast.seasonality_factor}x
                  </Badge>
                  <Badge variant="outline" className="rounded-lg text-xs">
                    {forecast.category || "General"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="text-base font-semibold text-foreground">
                Sales History & Forecast Projection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
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
                        background: "hsl(var(--card))",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Actual Sales"
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      name="Forecast"
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="inline-block size-3 rounded-full bg-primary" />
                  Actual Sales
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block size-3 rounded-full bg-amber-500" />
                  AI Forecast
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
