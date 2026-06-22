export type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled"

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  total: number
}

export interface Order {
  id: number
  order_number: string
  shopkeeper_id: number
  customer_id: number | null
  customer_name: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  gst: number
  total: number
  status: OrderStatus
  payment_method: string
  notes: string | null
  created_at: string
  updated_at: string
}
