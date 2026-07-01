export interface Product {
  id: number
  product_uuid: string
  name: string
  sku: string
  category: string | null
  brand: string | null
  description: string | null
  cost_price: number
  selling_price: number
  stock_quantity: number
  reserved_quantity: number
  reorder_threshold: number
  owner_id: number
  store_id: number | null
  store_name: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  name: string
  sku: string
  category: string | null | undefined
  brand: string
  description: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  reorder_threshold: number
  store_id: number | null
}
