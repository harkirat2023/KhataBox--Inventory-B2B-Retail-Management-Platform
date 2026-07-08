"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignUp, useAuth } from "@clerk/nextjs"
import { Boxes, User, MapPin, Building2, CreditCard, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LandingNav } from "@/components/layout/landing-nav"
import { clientApi } from "@/lib/client-api"

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
  const role = roleFromUrl === "customer" || roleFromUrl === "shopkeeper" || roleFromUrl === "admin" ? roleFromUrl : "shopkeeper"
  const isCustomer = role === "customer"
  const isAdmin = role === "admin"

  const { signUp, isLoaded: clerkLoaded } = useSignUp()
  const { getToken } = useAuth()

  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", state: "",
    store_name: "", store_type: "", pin_code: "", gst_number: "",
    monthly_revenue: "", business_description: "",
  })
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"form" | "otp" | "complete">("form")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpLoading, setOtpLoading] = useState(false)

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.email) { setError("Email is required"); return }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return }
    if (password !== confirmPassword) { setError("Passwords do not match"); return }
    if (!clerkLoaded || !signUp) return
    setOtpLoading(true)
    try {
      const signUpAttempt = await signUp.create({ emailAddress: form.email })
      if (signUpAttempt.status !== "missing_requirements") {
        setError(`Clerk signup returned unexpected status: ${signUpAttempt.status}`)
        setOtpLoading(false)
        return
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setStep("otp")
    } catch (err: any) {
      const clerkMsg = err?.errors?.[0]?.message || ""
      const clerkCode = err?.errors?.[0]?.code || ""
      setError(clerkMsg || "Failed to send OTP. Please try again.")
      if (clerkCode === "form_identifier_exists") setError("An account with this email already exists. Please sign in instead.")
    }
    setOtpLoading(false)
  }

  async function exchangeClerkToken() {
    try {
      const clerkToken = await getToken()
      if (!clerkToken) return
      const res = await fetch(`${API_URL}/api/v1/auth/clerk-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clerkToken}` },
      })
      if (!res.ok) return
      const data = await res.json()
      document.cookie = `clerk_jwt=${data.access_token}; Path=/; SameSite=Lax; Secure; Max-Age=86400`
    } catch { /* non-blocking */ }
  }

  async function handlePasswordRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !password) { setError("Name, email, and password are required"); return }
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password, name: form.name, phone: form.phone, role: "admin" }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || "Registration failed")
        setLoading(false)
        return
      }
      const data = await res.json()
      // Log in the admin automatically
      const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password }),
      })
      if (loginRes.ok) {
        const loginData = await loginRes.json()
        document.cookie = `admin_token=${loginData.access_token}; Path=/; SameSite=Lax; Secure; Max-Age=86400`
      }
      window.location.href = "/admin/users"
    } catch {
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  async function handleVerifyOtp() {
    setError("")
    const otpStr = otp.join("")
    if (otpStr.length !== 6) { setError("Please enter the full 6-digit OTP"); return }
    if (!clerkLoaded || !signUp) return
    setLoading(true)
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code: otpStr })
      if (signUpAttempt.status !== "complete") {
        setError("Verification failed. Please try again.")
        setLoading(false)
        return
      }
      // Clerk user created — get the Clerk user ID
      const clerkId = signUpAttempt.createdUserId
      if (!clerkId) {
        setError("Failed to get Clerk user ID. Please refresh and try again.")
        setLoading(false)
        return
      }
      const payload: Record<string, unknown> = {
        clerk_id: clerkId, name: form.name, email: form.email,
        password, phone: form.phone, role,
      }
      if (isCustomer) {
        if (form.address) payload.address = form.address
        if (form.city) payload.city = form.city
        if (form.state) payload.state = form.state
      } else {
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
      await clientApi.post("/api/v1/auth/clerk-register", payload)
      setStep("complete")
      setTimeout(() => {
        window.location.href = `/login?role=${role}`
      }, 500)
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || "Verification failed")
    }
    setLoading(false)
  }

  function handleOtpChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  function resendOtp() {
    setOtpLoading(true)
    setOtp(["", "", "", "", "", ""])
    if (clerkLoaded && signUp) {
      signUp.prepareEmailAddressVerification({ strategy: "email_code" }).finally(() => setOtpLoading(false))
    }
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm text-center">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
              <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10 text-primary mb-3">
                <Boxes className="size-6" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Account Created!</h1>
              <p className="text-sm text-muted-foreground mt-1">Redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "otp") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10 text-primary mb-3">
                  <Mail className="size-6" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Verify your email</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Check <strong className="text-foreground">{form.email}</strong> for a 6-digit code
                </p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <div className="flex items-center justify-center gap-2 mb-6">
                {otp.map((digit, i) => (
                  <Input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={digit} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl" autoFocus={i === 0} />
                ))}
              </div>
              <div id="clerk-captcha" />
              <Button className="w-full h-11 rounded-xl text-base" onClick={handleVerifyOtp} disabled={loading || otp.join("").length !== 6}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Didn&apos;t receive the code?{" "}
                <button onClick={resendOtp} disabled={otpLoading} className="text-primary font-medium hover:text-primary transition-colors">
                  {otpLoading ? "Sending..." : "Resend"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <div className="py-8 px-4 pt-20">
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary shadow-lg shadow-blue-200 mb-3">
              <Boxes className="size-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">{isAdmin ? "Create Admin Account" : isCustomer ? "Create Customer Account" : "Create Shopkeeper Account"}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Register as an administrator" : isCustomer ? "Register to shop and track your orders" : "Register your shop on KhataBox"}</p>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
            <form onSubmit={isAdmin ? handlePasswordRegister : handleSendOtp} className="space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground/80">Personal Information</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Full Name *</label>
                    <Input placeholder="Your full name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Phone Number *</label>
                    <Input type="tel" placeholder="10-digit number" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} required pattern="[0-9]{10}" maxLength={10} className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Email *</label>
                    <Input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required className="h-11 rounded-xl" />
                  </div>
                  {isAdmin ? (
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1">Password *</label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" className="h-11 rounded-xl" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Password *</label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" className="h-11 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Confirm Password *</label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Re-enter your password" className="h-11 rounded-xl" />
                      </div>
                    </>
                  )}
                </div>
              </div>
              {isCustomer && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground/80">Optional: Address</span>
                  </div>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-foreground/80 mb-1">Address</label><Input placeholder="Street address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} className="h-11 rounded-xl" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">City</label><Input placeholder="City" value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="h-11 rounded-xl" /></div>
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">State</label><Input placeholder="State" value={form.state} onChange={(e) => handleChange("state", e.target.value)} className="h-11 rounded-xl" /></div>
                    </div>
                  </div>
                </div>
              )}
              {!isCustomer && !isAdmin && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground/80">Business Information</span>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">Store Name *</label><Input placeholder="Your store name" value={form.store_name} onChange={(e) => handleChange("store_name", e.target.value)} required className="h-11 rounded-xl" /></div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Store Type *</label>
                        <select value={form.store_type} onChange={(e) => handleChange("store_type", e.target.value)} required
                          className="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary">
                          <option value="">Select store type</option>
                          {STORE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">Address *</label><Input placeholder="Street address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} required className="h-11 rounded-xl" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-foreground/80 mb-1">City *</label><Input placeholder="City" value={form.city} onChange={(e) => handleChange("city", e.target.value)} required className="h-11 rounded-xl" /></div>
                        <div>
                          <label className="block text-sm font-medium text-foreground/80 mb-1">State *</label>
                          <select value={form.state} onChange={(e) => handleChange("state", e.target.value)} required
                            className="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary">
                            <option value="">Select state</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">PIN Code *</label><Input placeholder="6-digit PIN code" value={form.pin_code} onChange={(e) => handleChange("pin_code", e.target.value)} required pattern="[0-9]{6}" maxLength={6} className="h-11 rounded-xl" /></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground/80">Optional: Business Details</span>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">GST Number</label><Input placeholder="15-digit GST number" value={form.gst_number} onChange={(e) => handleChange("gst_number", e.target.value)} maxLength={15} className="h-11 rounded-xl" /></div>
                      <div><label className="block text-sm font-medium text-foreground/80 mb-1">Monthly Revenue (₹)</label><Input type="number" placeholder="e.g., 50000" value={form.monthly_revenue} onChange={(e) => handleChange("monthly_revenue", e.target.value)} className="h-11 rounded-xl" /></div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Business Description</label>
                        <textarea value={form.business_description} onChange={(e) => handleChange("business_description", e.target.value)} placeholder="Describe your business..."
                          className="flex min-h-[80px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary" />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {!isAdmin && <div id="clerk-captcha" />}
              {isAdmin ? (
                <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={loading}>
                  {loading ? "Creating account..." : "Create Admin Account"}
                </Button>
              ) : (
                <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={otpLoading || !clerkLoaded}>
                  {otpLoading ? "Sending OTP..." : "Send Verification OTP"}
                </Button>
              )}
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-primary font-medium hover:text-primary transition-colors">Sign In</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card rounded-2xl shadow-sm border border-border p-8 text-center w-full max-w-sm">
        <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary animate-pulse mb-3">
          <Boxes className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
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
