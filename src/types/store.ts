export interface Store {
  id: number
  name: string
  store_type: string | null
  address: string | null
  city: string | null
  state: string | null
  pin_code: string | null
  gst_number: string | null
  monthly_revenue: number | null
  business_description: string | null
  owner_id: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreFormData {
  name: string
  address: string
}

export interface StockTransfer {
  id: number
  product_id: number
  from_store_id: number
  to_store_id: number
  quantity: number
  status: "pending" | "approved" | "rejected" | "completed"
  requested_by: number
  approved_by: number | null
  notes: string | null
  from_store_name: string | null
  to_store_name: string | null
  product_name: string | null
  product_sku: string | null
  created_at: string
  updated_at: string
}

export interface StockTransferFormData {
  product_id: number
  from_store_id: number
  to_store_id: number
  quantity: number
  notes: string
}
