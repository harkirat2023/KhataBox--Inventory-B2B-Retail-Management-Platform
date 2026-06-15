export interface Customer {
  id: number
  company_name: string
  contact_person: string
  email: string
  phone: string
  gst_number: string
  credit_limit: number
  credit_used: number
  price_tier: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  company_name: string
  contact_person: string
  email: string
  phone: string
  gst_number: string
  credit_limit: number
  price_tier: string
}
