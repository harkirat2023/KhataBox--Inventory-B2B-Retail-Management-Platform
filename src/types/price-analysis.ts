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
