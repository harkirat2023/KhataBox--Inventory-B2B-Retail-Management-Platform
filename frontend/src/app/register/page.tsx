"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Boxes, User, Store, MapPin, Building2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Store type options
const STORE_TYPES = [
  { value: "kirana", label: "Kirana / General Store" },
  { value: "supermart", label: "Supermart / Hypermarket" },
  { value: "pharmacy", label: "Pharmacy / Medical Store" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing / Fashion" },
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "other", label: "Other" },
]

// Indian states
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
    // Customer-specific
    address: "",
    city: "",
    state: "",
    // Shopkeeper business fields
    store_name: "",
    store_type: "",
    pin_code: "",
    gst_number: "",
    monthly_revenue: "",
    business_description: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Force to customer if missing or invalid
  const role = roleFromUrl === "customer" || roleFromUrl === "shopkeeper" ? roleFromUrl : "shopkeeper"

  useEffect(() => {
    if (roleFromUrl === "admin") {
      router.replace("/login")
    }
  }, [roleFromUrl, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Client-side validation
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    // Build payload based on role
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      password: form.password,
      confirm_password: form.confirm_password,
      phone: form.phone,
    }

    if (role === "customer") {
      if (form.address) payload.address = form.address
      if (form.city) payload.city = form.city
      if (form.state) payload.state = form.state
    }

    // Shopkeeper-specific fields
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, role }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.detail || "Registration failed")
      return
    }
    router.push("/login")
  }

  const isCustomer = role === "customer"
  const isShopkeeper = role === "shopkeeper"
  const title = isCustomer ? "Create Customer Account" : "Create Shopkeeper Account"
  const description = isCustomer
    ? "Register to shop and track your orders"
    : "Register your shop on KhataBox"

  // Input change handler
  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            {isCustomer ? (
              <User className="size-8 text-green-600" />
            ) : (
              <Store className="size-8 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* PERSONAL INFORMATION */}
            <div className="border-b pb-2 mb-4">
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <User className="size-4" />
                Personal Information
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number *</label>
              <Input
                type="tel"
                placeholder="10-digit number"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
                pattern="[0-9]{10}"
                maxLength={10}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password *</label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password *</label>
              <Input
                type="password"
                placeholder="Re-enter password"
                value={form.confirm_password}
                onChange={(e) => handleChange("confirm_password", e.target.value)}
                required
              />
            </div>

            {/* SHOPKEEPER BUSINESS INFORMATION */}
            {isShopkeeper && (
              <>
                <div className="border-b pb-2 mt-6 mb-4">
                  <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Building2 className="size-4" />
                    Business Information
                  </p>
                </div>

                {/* Store Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Store Name *</label>
                  <Input
                    placeholder="Your store name"
                    value={form.store_name}
                    onChange={(e) => handleChange("store_name", e.target.value)}
                    required
                  />
                </div>

                {/* Store Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Store Type *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.store_type}
                    onChange={(e) => handleChange("store_type", e.target.value)}
                    required
                  >
                    <option value="">Select store type</option>
                    {STORE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address *</label>
                  <Input
                    placeholder="Street address"
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    required
                  />
                </div>

                {/* City & State */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City *</label>
                    <Input
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      required
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* PIN Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">PIN Code *</label>
                  <Input
                    placeholder="6-digit PIN code"
                    value={form.pin_code}
                    onChange={(e) => handleChange("pin_code", e.target.value)}
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                  />
                </div>

                {/* OPTIONAL BUSINESS SECTION */}
                <div className="border-b pb-2 mt-6 mb-4">
                  <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <CreditCard className="size-4" />
                    Optional: Business Details
                  </p>
                </div>

                {/* GST Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">GST Number</label>
                  <Input
                    placeholder="15-digit GST number"
                    value={form.gst_number}
                    onChange={(e) => handleChange("gst_number", e.target.value)}
                    maxLength={15}
                  />
                </div>

                {/* Monthly Revenue */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Monthly Revenue (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={form.monthly_revenue}
                    onChange={(e) => handleChange("monthly_revenue", e.target.value)}
                  />
                </div>

                {/* Business Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Description</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe your business..."
                    value={form.business_description}
                    onChange={(e) => handleChange("business_description", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* CUSTOMER ADDRESS (minimal) */}
            {isCustomer && (
              <>
                <div className="border-b pb-2 mt-6 mb-4">
                  <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <MapPin className="size-4" />
                    Optional: Add Address
                  </p>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    placeholder="Street address"
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>

                {/* City & State */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input
                      placeholder="State"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Sign In
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Boxes className="size-8 text-muted-foreground animate-pulse" />
          </div>
          <CardTitle className="text-xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
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