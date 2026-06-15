export interface Supplier {
  id: number
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupplierFormData {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
}
