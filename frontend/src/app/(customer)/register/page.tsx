"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Boxes, User, MapPin, Building2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

const STORE_TYPES = [
  { value: "kirana", label: "Kirana / General Store" },
  { value: "supermart", label: "Supermart / Hypermarket" },
  { value: "pharmacy", label: "Pharmacy / Medical Store" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing / Fashion" },
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "other", label: "Other" },
]

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir",
  "Ladakh", "Puducherry", "Chandigarh", "Andaman & Nicobar Islands",
  "Dadra & Nagar Haveli", "Daman & Diu", "Lakshadweep",
]

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleFromUrl = searchParams.get("role") as "customer" | "shopkeeper" | "admin" | null

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    store_name: "",
    store_type: "",
    pin_code: "",
    gst_number: "",
    monthly_revenue: "",
    business_description: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const role = roleFromUrl === "customer" || roleFromUrl === "shopkeeper" ? roleFromUrl : "shopkeeper"

  useEffect(() => {
    if (roleFromUrl === "admin") router.replace("/login")
  }, [roleFromUrl, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (form.password !== form.confirm_password) { setError("Passwords do not match"); return }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return }
    setLoading(true)
    const payload: Record<string, unknown> = {
      name: form.name, email: form.email, password: form.password,
      confirm_password: form.confirm_password, phone: form.phone,
    }
    if (role === "customer") { if (form.address) payload.address = form.address; if (form.city) payload.city = form.city; if (form.state) payload.state = form.state }
    if (role === "shopkeeper") {
      if (form.store_name) payload.store_name = form.store_name
      if (form.store_type) payload.store_type = form.store_type
      if (form.address) payload.address = form.address
      if (form.city) payload.city = form.city
      if (form.state) payload.state = form.state
      if (form.pin_code) payload.pin_code = form.pin_code
      if (form.gst_number) payload.gst_number = form.gst_number
      if (form.monthly_revenue) payload.monthly_revenue = parseFloat(form.monthly_revenue) || null
      if (form.business_description) payload.business_description = form.business_description
    }
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, role }),
    })
    setLoading(false)
    if (!res.ok) { const data = await res.json(); setError(data.detail || "Registration failed"); return }
    router.push("/login")
  }

  const isCustomer = role === "customer"
  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-3">
            <Boxes className="size-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{isCustomer ? "Create Customer Account" : "Create Shopkeeper Account"}</h1>
          <p className="text-sm text-slate-500 mt-1">{isCustomer ? "Register to shop and track your orders" : "Register your shop on KhataBox"}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="size-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Personal Information</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <Input placeholder="Your full name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                  <Input type="tel" placeholder="10-digit number" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} required pattern="[0-9]{10}" maxLength={10} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <Input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                    <Input type="password" placeholder="Min 6 chars" value={form.password} onChange={(e) => handleChange("password", e.target.value)} required minLength={6} className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm *</label>
                    <Input type="password" placeholder="Re-enter" value={form.confirm_password} onChange={(e) => handleChange("confirm_password", e.target.value)} required className="h-11 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            {isCustomer && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="size-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Optional: Address</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <Input placeholder="Street address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <Input placeholder="City" value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                      <Input placeholder="State" value={form.state} onChange={(e) => handleChange("state", e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isCustomer && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="size-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Business Information</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Store Name *</label>
                      <Input placeholder="Your store name" value={form.store_name} onChange={(e) => handleChange("store_name", e.target.value)} required className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Store Type *</label>
                      <select value={form.store_type} onChange={(e) => handleChange("store_type", e.target.value)} required
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500">
                        <option value="">Select store type</option>
                        {STORE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
                      <Input placeholder="Street address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} required className="h-11 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                        <Input placeholder="City" value={form.city} onChange={(e) => handleChange("city", e.target.value)} required className="h-11 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                        <select value={form.state} onChange={(e) => handleChange("state", e.target.value)} required
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500">
                          <option value="">Select state</option>
                          {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code *</label>
                      <Input placeholder="6-digit PIN code" value={form.pin_code} onChange={(e) => handleChange("pin_code", e.target.value)} required pattern="[0-9]{6}" maxLength={6} className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="size-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Optional: Business Details</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                      <Input placeholder="15-digit GST number" value={form.gst_number} onChange={(e) => handleChange("gst_number", e.target.value)} maxLength={15} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Revenue (₹)</label>
                      <Input type="number" placeholder="e.g., 50000" value={form.monthly_revenue} onChange={(e) => handleChange("monthly_revenue", e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Business Description</label>
                      <textarea value={form.business_description} onChange={(e) => handleChange("business_description", e.target.value)} placeholder="Describe your business..."
                        className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500" />
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center w-full max-w-sm">
        <div className="inline-flex items-center justify-center size-12 rounded-xl bg-blue-50 text-blue-600 animate-pulse mb-3">
          <Boxes className="size-6" />
        </div>
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  )
}
