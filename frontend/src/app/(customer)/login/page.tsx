"use client"

import { useState, useEffect, Suspense } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Boxes, User, Store, Shield, Mail, Lock, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LandingNav } from "@/components/layout/landing-nav"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

type Role = "customer" | "shopkeeper" | "admin"
type Step = "email" | "otp-login" | "otp-reset" | "password" | "new-password"

const ROLE_CONFIG = {
  customer: { title: "Customer", icon: User, description: "Shop and track your orders", iconBg: "bg-primary/10 text-primary" },
  shopkeeper: { title: "Shopkeeper", icon: Store, description: "Manage your store inventory and orders", iconBg: "bg-primary/10 text-primary" },
  admin: { title: "Admin", icon: Shield, description: "Access admin dashboard and analytics", iconBg: "bg-primary/10 text-primary" },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") as Role | null
  const { signIn, isLoaded: clerkLoaded } = useSignIn()

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("email")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])

  useEffect(() => {
    if (roleParam && ["customer", "shopkeeper", "admin"].includes(roleParam)) {
      setSelectedRole(roleParam)
      setStep(roleParam === "admin" ? "password" : "email")
    }
  }, [roleParam])

  function isClerkNotFoundError(err: any): boolean {
    const msg = err?.errors?.[0]?.message || ""
    return msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("couldn't find")
  }

  // --- Login via Clerk OTP ---
  async function handleSendLoginOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole || !signIn || !clerkLoaded) return
    setError("")
    setLoading(true)
    try {
      await signIn.create({ identifier: email, strategy: "email_code" })
      setStep("otp-login")
    } catch (err: any) {
      if (isClerkNotFoundError(err)) {
        setStep("password")
        setError("")
      } else {
        setError(err?.errors?.[0]?.message || "Failed to send code")
      }
    }
    setLoading(false)
  }

  async function handleVerifyLoginOtp() {
    const otpStr = otp.join("")
    if (otpStr.length !== 6) { setError("Enter the full 6-digit code"); return }
    if (!signIn || !clerkLoaded) return
    setError("")
    setLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "email_code", code: otpStr })
      if (result.status === "complete") {
        router.push(selectedRole === "customer" ? "/customer" : "/dashboard")
      } else {
        setError("Verification failed")
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Invalid code")
    }
    setLoading(false)
  }

  // --- Login via Password (backend /api/v1/auth/login) ---
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole || !email || !password) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || "Invalid email or password")
        setLoading(false)
        return
      }
      router.push(selectedRole === "customer" ? "/customer" : "/dashboard")
    } catch {
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  // --- Forgot Password (via Clerk) ---
  async function handleSendResetOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn || !clerkLoaded) return
    setError("")
    setLoading(true)
    try {
      await signIn.create({ identifier: email, strategy: "reset_password_email_code" })
      setStep("otp-reset")
    } catch (err: any) {
      if (isClerkNotFoundError(err)) {
        setError("No account found with this email. Please sign up first.")
      } else {
        setError(err?.errors?.[0]?.message || "Failed to send reset code")
      }
    }
    setLoading(false)
  }

  async function handleVerifyResetOtp() {
    const otpStr = otp.join("")
    if (otpStr.length !== 6) { setError("Enter the full 6-digit code"); return }
    if (!signIn || !clerkLoaded) return
    setError("")
    setLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: otpStr })
      if (result.status === "needs_new_password") {
        setStep("new-password")
      } else {
        setError("Reset failed — unexpected response")
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Invalid code")
    }
    setLoading(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn || !clerkLoaded || !newPassword) return
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return }
    setError("")
    setLoading(true)
    try {
      await signIn.resetPassword({ password: newPassword })
      router.push(selectedRole === "customer" ? "/customer" : "/dashboard")
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to reset password")
    }
    setLoading(false)
  }

  function handleSignup() {
    if (selectedRole === "admin") { setError("Admin registration is not publicly available"); return }
    router.push(`/register?role=${selectedRole}`)
  }

  // --- OTP helpers ---
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

  function goToStep(s: Step) { setStep(s); setError(""); setOtp(["", "", "", "", "", ""]) }

  // ==================== Role Selection ====================
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
                  <button key={r} onClick={() => { setSelectedRole(r); setStep(r === "admin" ? "password" : "email") }}
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

  // ==================== OTP (login) ====================
  if (step === "otp-login") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <button onClick={() => goToStep("email")} className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1">← Back</button>
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><Icon className="size-6" /></div>
                <h1 className="text-xl font-bold text-foreground">Enter verification code</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Check <strong className="text-foreground">{email}</strong> for a 6-digit code</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <div id="clerk-captcha" />
              <div className="flex items-center justify-center gap-2 mb-6">
                {otp.map((d, i) => (
                  <Input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl" autoFocus={i === 0} />
                ))}
              </div>
              <Button className="w-full h-11 rounded-xl text-base" onClick={handleVerifyLoginOtp} disabled={loading || otp.join("").length !== 6}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button onClick={() => goToStep("password")} className="text-primary font-medium hover:text-primary transition-colors">Sign in with password instead</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== OTP (reset) ====================
  if (step === "otp-reset") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <button onClick={() => goToStep("email")} className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1">← Back</button>
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><KeyRound className="size-6" /></div>
                <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Enter the code sent to <strong className="text-foreground">{email}</strong></p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <div id="clerk-captcha" />
              <div className="flex items-center justify-center gap-2 mb-6">
                {otp.map((d, i) => (
                  <Input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl" autoFocus={i === 0} />
                ))}
              </div>
              <Button className="w-full h-11 rounded-xl text-base" onClick={handleVerifyResetOtp} disabled={loading || otp.join("").length !== 6}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== New Password (after reset) ====================
  if (step === "new-password") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><KeyRound className="size-6" /></div>
                <h1 className="text-xl font-bold text-foreground">Set new password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Choose a new password for your account</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">New Password</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" className="h-11 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={loading}>{loading ? "Resetting..." : "Reset Password & Sign In"}</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== Email input (customer/shopkeeper) ====================
  if (step === "email") {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <button onClick={() => { setSelectedRole(null); setStep("email") }} className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1">← Back to role selection</button>
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><Mail className="size-6" /></div>
                <h1 className="text-xl font-bold text-foreground">{config.title} Login</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Enter your email to continue</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <div id="clerk-captcha" />
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" className="h-11 rounded-xl" />
                </div>
                <Button onClick={handleSendLoginOtp} className="w-full h-11 rounded-xl text-base" disabled={loading || !email || !clerkLoaded}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>
                <Button onClick={() => goToStep("password")} variant="outline" className="w-full h-11 rounded-xl text-base">
                  Sign in with password
                </Button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={handleSignup} className="text-sm text-primary font-medium hover:text-primary transition-colors">Create account</button>
                <button onClick={handleSendResetOtp} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Forgot password?</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== Password form (all roles) ====================
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
            <div className="text-center mb-6">
              <button onClick={() => { setSelectedRole(null); setStep("email") }} className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1">← Back</button>
              <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3"><Lock className="size-6" /></div>
              <h1 className="text-xl font-bold text-foreground">{selectedRole === "admin" ? "Admin Login" : `${config.title} Login`}</h1>
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
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="h-11 rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
              <div className="flex items-center justify-between mt-4">
                {selectedRole !== "admin" ? (
                  <>
                    <button onClick={() => router.push(`/register?role=${selectedRole}`)} className="text-sm text-primary font-medium hover:text-primary transition-colors">Create account</button>
                    <button onClick={() => goToStep("email")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Other sign in options</button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground w-full text-center">Admin access is restricted.</p>
                )}
              </div>
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
