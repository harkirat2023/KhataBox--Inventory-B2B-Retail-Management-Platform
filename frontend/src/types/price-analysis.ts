export interface PriceAnalysisItem {
  product_id: number
  product_name: string
  product_sku: string
  category: string
  supplier_id: number
  supplier_name: string
  last_supplier_price: number
  current_selling_price: number
  current_cost_price: number
  margin_percent: number
  profit_per_unit: number
  last_purchased: string | null
}

export interface SupplierPriceAnalysis {
  supplier_id: number
  supplier_name: string
  items: PriceAnalysisItem[]
  avg_margin_percent: number
  total_items: number
}

export interface ProcurementItem {
  product_id: number
  product_name: string
  sku: string
  category: string | null
  cost_price: number
  selling_price: number
  market_price: number | null
  vendor_price: number | null
  cost_vs_market_diff: number
  cost_vs_market_pct: number
}

export interface ProfitabilityItem {
  product_id: number
  product_name: string
  sku: string
  cost_price: number
  selling_price: number
  landed_cost: number
  gross_profit: number
  gross_margin_pct: number
  gmroi: number
  revenue_projection: number
  total_profit: number
  stock_quantity: number
}

export interface HMLDistribution {
  high: number
  medium: number
  low: number
}

export interface LowStockAlert {
  product_id: number
  product_name: string
  sku: string
  stock_quantity: number
  reorder_threshold: number
}

export interface PriceAnalysisOverview {
  total_products: number
  procurement_analysis: ProcurementItem[]
  profitability: ProfitabilityItem[]
  hml: HMLDistribution
  low_stock_alerts: LowStockAlert[]
}

export interface TrueCostResponse {
  product_id: number
  product_name: string
  components: {
    cost_price: number
    shipping_cost: number
    freight: number
    handling: number
    packaging: number
    tariff: number
  }
  landed_cost: number
  selling_price: number
  profit_at_current: number
  margin_at_current: number
}

export interface PricingSuggestion {
  target_margin_pct: number
  suggested_price: number
  current_price: number
  current_margin_pct: number
  expected_margin_pct: number
  price_change: number
  price_change_pct: number
}

export interface DynamicPricingResponse {
  product_id: number
  product_name: string
  current_price: number
  cost_price: number
  current_margin_pct: number
  sales_velocity_30d: number
  inventory_age_days: number
  suggestions: PricingSuggestion[]
  recommendation: string
}
