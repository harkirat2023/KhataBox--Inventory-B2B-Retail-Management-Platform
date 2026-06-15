"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Boxes, User, Store, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Role = "customer" | "shopkeeper" | "admin"

const ROLE_CONFIG = {
  customer: {
    title: "Customer",
    icon: User,
    description: "Shop and track your orders",
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
    borderColor: "border-green-200",
  },
  shopkeeper: {
    title: "Shopkeeper",
    icon: Store,
    description: "Manage your store inventory and orders",
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    borderColor: "border-blue-200",
  },
  admin: {
    title: "Admin",
    icon: Shield,
    description: "Access admin dashboard and analytics",
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
    borderColor: "border-purple-200",
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

  // Set initial role from URL parameter
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
      // Route to correct dashboard based on role
      if (selectedRole === "customer") {
        router.push("/customer")
      } else if (selectedRole === "admin") {
        router.push("/dashboard")
      } else {
        router.push("/dashboard")
      }
    }
  }

  function handleSignup() {
    if (selectedRole === "admin") {
      setError("Admin registration is not publicly available")
      return
    }
    router.push(`/register?role=${selectedRole}`)
  }

  // Role selection view
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Boxes className="size-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to KhataBox</CardTitle>
            <CardDescription>Select your role to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
                const config = ROLE_CONFIG[role]
                const Icon = config.icon
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`p-6 rounded-lg border-2 ${config.bgColor} ${config.borderColor} transition-all hover:shadow-md text-left`}
                  >
                    <Icon className={`size-8 mb-3 ${config.color}`} />
                    <h3 className={`font-semibold text-lg mb-1 ${config.color}`}>{config.title}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Login form view
  const config = ROLE_CONFIG[selectedRole]
  const Icon = config.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <button
            onClick={() => setSelectedRole(null)}
            className="text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            ← Back to role selection
          </button>
          <div className={`flex justify-center mb-2 p-3 rounded-full ${config.bgColor} w-fit mx-auto`}>
            <Icon className={`size-8 ${config.color}`} />
          </div>
          <CardTitle className="text-xl">{config.title} Login</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={`your@email.com`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Signup link for customer/shopkeeper only */}
          {selectedRole !== "admin" && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <button onClick={handleSignup} className="text-primary hover:underline">
                Sign Up
              </button>
            </p>
          )}

          {/* Admin notice */}
          {selectedRole === "admin" && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Admin access is restricted. Contact your system administrator for credentials.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}