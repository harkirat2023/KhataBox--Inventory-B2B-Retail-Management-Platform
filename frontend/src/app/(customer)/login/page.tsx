"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Boxes, User, Store, Shield, Mail, Lock, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LandingNav } from "@/components/layout/landing-nav"
import { setAuthToken } from "@/lib/client-api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

type Role = "customer" | "shopkeeper" | "admin"
type Step = "password" | "otp-email" | "otp-verify" | "forgot-password"

const ROLE_CONFIG = {
  customer: { title: "Customer", icon: User, description: "Shop and track your orders", iconBg: "bg-primary/10 text-primary" },
  shopkeeper: { title: "Shopkeeper", icon: Store, description: "Manage your store inventory and orders", iconBg: "bg-primary/10 text-primary" },
  admin: { title: "Admin", icon: Shield, description: "Access admin dashboard and analytics", iconBg: "bg-primary/10 text-primary" },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") as Role | null

  const [selectedRole, setSelectedRole] = useState<Role | null>(roleParam || null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("password")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])

  const isAdmin = selectedRole === "admin"

  const API = (path: string) => `${API_URL}${path}`

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole || !email || !password) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch(API("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: selectedRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || "Invalid email or password")
        setLoading(false)
        return
      }
      const data = await res.json()
      setAuthToken(data.access_token)
      window.location.href = isAdmin ? "/admin/users" : selectedRole === "customer" ? "/customer" : "/dashboard"
    } catch {
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  async function handleSendOtp() {
    if (!email) { setError("Enter your email first"); return }
    setError("")
    setLoading(true)
    try {
      const res = await fetch(API("/api/v1/auth/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || "Failed to send OTP")
        setLoading(false)
        return
      }
      setStep("otp-verify")
    } catch {
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  async function handleVerifyOtp() {
    const otpStr = otp.join("")
    if (otpStr.length !== 6) { setError("Enter the full 6-digit code"); return }
    setError("")
    setLoading(true)
    try {
      const res = await fetch(API("/api/v1/auth/login-with-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpStr, role: selectedRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || "Invalid or expired OTP")
        setLoading(false)
        return
      }
      const data = await res.json()
      setAuthToken(data.access_token)
      window.location.href = selectedRole === "customer" ? "/customer" : "/dashboard"
    } catch {
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  function handleOtpChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus()
  }

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary shadow-lg shadow-blue-200 mb-4"><Boxes className="size-7 text-white" /></div>
              <h1 className="text-2xl font-bold text-foreground">Welcome to KhataBox</h1>
              <p className="text-sm text-muted-foreground mt-1">Select your role to continue</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => {
                const cfg = ROLE_CONFIG[r]
                const Icon = cfg.icon
                return (
                  <button key={r} onClick={() => { setSelectedRole(r); setStep("password") }}
                    className="p-5 rounded-2xl bg-card border-2 border-border transition-all duration-200 text-left hover:border-primary/30 hover:shadow-lg hover:shadow-blue-100/30 hover:-translate-y-0.5">
                    <div className={`inline-flex p-2.5 rounded-xl ${cfg.iconBg} mb-3`}><Icon className="size-5" /></div>
                    <h3 className="font-semibold text-foreground text-sm">{cfg.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const config = ROLE_CONFIG[selectedRole]
  const Icon = config.icon

  if (step === "otp-verify") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <button onClick={() => setStep("password")} className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1">Back</button>
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><Icon className="size-6" /></div>
                <h1 className="text-xl font-bold text-foreground">Enter verification code</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Check <strong className="text-foreground">{email}</strong> for a 6-digit code</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
                {otp.map((d, i) => (
                  <Input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl" autoFocus={i === 0} />
                ))}
              </div>
              <Button className="w-full h-11 rounded-xl text-base" onClick={handleVerifyOtp} disabled={loading || otp.join("").length !== 6}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button onClick={() => setStep("password")} className="text-primary font-medium hover:text-primary transition-colors">Sign in with password instead</button>
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
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
            <div className="text-center mb-6">
              <button onClick={() => router.push("/khatabox#roles")} className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1">Back</button>
              <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><Lock className="size-6" /></div>
              <h1 className="text-xl font-bold text-foreground">{isAdmin ? "Admin Login" : `${config.title} Login`}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Sign in with your password</p>
            </div>
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="password" className="h-11 rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            {!isAdmin && (
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => router.push(`/register?role=${selectedRole}`)} className="text-sm text-primary font-medium hover:text-primary transition-colors">Create account</button>
                  <button onClick={handleSendOtp} className="text-sm text-primary font-medium hover:text-primary transition-colors">Sign in with OTP</button>
                </div>
              </div>
            )}
            {isAdmin && (
              <p className="text-xs text-muted-foreground w-full text-center mt-4">Admin access is restricted.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card rounded-2xl shadow-sm border border-border p-8 text-center w-full max-w-sm">
        <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary animate-pulse mb-3"><Boxes className="size-6" /></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
