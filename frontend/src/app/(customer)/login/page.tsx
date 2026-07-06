"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Boxes, User, Store, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Role = "customer" | "shopkeeper" | "admin"

const ROLE_CONFIG = {
  customer: {
    title: "Customer",
    icon: User,
    description: "Shop and track your orders",
    gradient: "from-primary to-primary/90",
    borderActive: "border-primary/30",
    bgHover: "hover:bg-primary/10",
    iconBg: "bg-primary/10 text-primary",
  },
  shopkeeper: {
    title: "Shopkeeper",
    icon: Store,
    description: "Manage your store inventory and orders",
    gradient: "from-primary to-primary/90",
    borderActive: "border-primary/30",
    bgHover: "hover:bg-primary/10",
    iconBg: "bg-primary/10 text-primary",
  },
  admin: {
    title: "Admin",
    icon: Shield,
    description: "Access admin dashboard and analytics",
    gradient: "from-primary to-primary/90",
    borderActive: "border-primary/30",
    bgHover: "hover:bg-primary/10",
    iconBg: "bg-primary/10 text-primary",
  },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") as Role | null

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (roleParam && ["customer", "shopkeeper", "admin"].includes(roleParam)) {
      setSelectedRole(roleParam)
    }
  }, [roleParam])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole) return
    setError("")
    setLoading(true)
    const result = await signIn("credentials", { email, password, role: selectedRole, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError("Invalid email or password")
    } else {
      if (selectedRole === "customer") router.push("/customer")
      else router.push("/dashboard")
    }
  }

  function handleSignup() {
    if (selectedRole === "admin") { setError("Admin registration is not publicly available"); return }
    router.push(`/register?role=${selectedRole}`)
  }

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary shadow-lg shadow-blue-200 mb-4">
              <Boxes className="size-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to KhataBox</h1>
            <p className="text-sm text-muted-foreground mt-1">Select your role to continue</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
              const config = ROLE_CONFIG[role]
              const Icon = config.icon
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className="p-5 rounded-2xl bg-card border-2 border-border transition-all duration-200 text-left hover:border-primary/30 hover:shadow-lg hover:shadow-blue-100/30 hover:-translate-y-0.5"
                >
                  <div className={`inline-flex p-2.5 rounded-xl ${config.iconBg} mb-3`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{config.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{config.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const config = ROLE_CONFIG[selectedRole]
  const Icon = config.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
          <div className="text-center mb-6">
            <button
              onClick={() => setSelectedRole(null)}
              className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-4 inline-flex items-center gap-1"
            >
              ← Back to role selection
            </button>
            <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3">
              <Icon className="size-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground">{config.title} Login</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}
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

          {selectedRole !== "admin" && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <button onClick={handleSignup} className="text-primary font-medium hover:text-primary transition-colors">
                Sign Up
              </button>
            </p>
          )}

          {selectedRole === "admin" && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Admin access is restricted. Contact your system administrator for credentials.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LoginLoading() {
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
