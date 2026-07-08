"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Boxes, User, Store, Shield, ArrowRight, CheckCircle,
  BarChart3, ShoppingCart, QrCode, Package, Brain,
  ChevronRight, Sparkles, Layers, Zap, ScanLine, CreditCard,
  Phone, Globe, Users, Receipt, Bell,
} from "lucide-react"
import { LandingNav } from "@/components/layout/landing-nav"

type Role = "customer" | "shopkeeper" | "admin"

const ROLE_CONFIG = {
  customer: {
    title: "Customer",
    icon: User,
    description: "Browse store catalogs, shop via QR codes, and track orders in real-time.",
    features: ["Browse Products", "QR Shopping", "Track Orders", "Digital Receipts"],
  },
  shopkeeper: {
    title: "Shopkeeper",
    icon: Store,
    description: "Manage inventory, process billing, and grow your business with AI insights.",
    features: ["Inventory Mgmt", "Billing & POS", "Sales Analytics", "Customer Management"],
  },
  admin: {
    title: "Admin",
    icon: Shield,
    description: "Full platform oversight — manage users, stores, and system configuration.",
    features: ["User Management", "System Config", "Data Analytics", "Audit Logs"],
  },
}

const FEATURES = [
  { icon: Package, title: "Inventory Management", description: "Track stock levels, batches, expiry dates, and set reorder thresholds across multiple stores from one dashboard." },
  { icon: QrCode, title: "QR Shopping", description: "Every product gets a unique QR code. Customers scan, add to cart, and order — no app required." },
  { icon: Store, title: "Multi-Store Support", description: "Manage multiple stores under one account. Each store has its own inventory, pricing, and customer base." },
  { icon: ShoppingCart, title: "Order Management", description: "Handle B2B and B2C orders with status tracking, approval workflows, and real-time notifications." },
  { icon: BarChart3, title: "Analytics & Reports", description: "Revenue dashboards, top-selling products, customer insights, and exportable reports." },
  { icon: Brain, title: "AI Insights", description: "Smart restock predictions, demand forecasting, expiry alerts, and price optimization suggestions." },
]

const STEPS = [
  { number: "01", title: "Shopkeeper Sets Up Store", description: "Register, add products with pricing, configure inventory, and generate QR codes for every item." },
  { number: "02", title: "Customer Browses & Orders", description: "Customers scan QR codes or browse the catalog, add items to cart, and place B2C orders online." },
  { number: "03", title: "Shopkeeper Processes Order", description: "Receive order notifications, approve or reject, and the customer sees real-time status updates." },
]

const CUSTOMER_WORKFLOW = [
  { icon: ScanLine, title: "Scan QR Code", description: "Walk into any KhataBox-enabled store. Scan product QR codes using your phone camera — no app download needed." },
  { icon: ShoppingCart, title: "Browse & Add to Cart", description: "View product details, pricing, and availability. Add items to your cart and adjust quantities instantly." },
  { icon: CreditCard, title: "Checkout & Pay", description: "Review your cart, apply coupons, and complete checkout. Pay later with Khata credit or pay on delivery." },
  { icon: Package, title: "Track Orders", description: "Get real-time order status updates. View digital receipts, order history, and delivery status from your dashboard." },
]

const SHOPKEEPER_WORKFLOW = [
  { icon: Package, title: "Manage Inventory", description: "Add products with SKUs, pricing, stock levels, and expiry dates. Bulk import via CSV/Excel. Get low-stock alerts." },
  { icon: Receipt, title: "Generate Bills", description: "Create invoices and receipts in seconds. Apply GST, discounts, and print or share digital receipts with customers." },
  { icon: Users, title: "Manage Customers", description: "Track customer purchase history, manage Khata credit limits, send notifications, and build loyalty programs." },
  { icon: BarChart3, title: "Grow with Insights", description: "View revenue dashboards, top-selling products, demand forecasts, and AI-powered reorder suggestions." },
]

export default function LandingPage() {
  const router = useRouter()
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null)

  function handleRoleSelect(role: Role) {
    router.push(`/login?role=${role}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 mb-6 shadow-sm">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">Inventory & Retail Management</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              The retail platform built for{" "}
              <span className="text-primary">modern businesses</span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Manage inventory, process billing, enable QR shopping, and get AI-powered insights — 
              all in one place. No complexity, no hidden costs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => handleRoleSelect("shopkeeper")}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 active:scale-[0.98]"
              >
                Start for Business <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => handleRoleSelect("customer")}
                className="inline-flex items-center gap-2 bg-card border-2 border-border text-foreground/80 font-semibold px-6 py-3 rounded-xl hover:border-border hover:bg-muted transition-all duration-200 active:scale-[0.98]"
              >
                Start Shopping <ShoppingCart className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> Smart Inventory</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> Billing & POS</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> QR Shopping</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> AI Analytics</span>
            </div>
          </div>
        </div>
      </section>

      {/* How Customers Use KhataBox */}
      <section className="py-16 md:py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
              <ScanLine className="size-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">For Customers</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Shop smarter without an app</h2>
            <p className="mt-3 text-muted-foreground">KhataBox turns every store into an online catalog. Walk in, scan, order — it&apos;s that simple.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CUSTOMER_WORKFLOW.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="relative bg-background rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Step {i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How Shopkeepers Use KhataBox */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
              <Store className="size-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">For Shopkeepers</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Run your store from one dashboard</h2>
            <p className="mt-3 text-muted-foreground">From inventory to billing to insights — manage everything without switching tools.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SHOPKEEPER_WORKFLOW.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="relative bg-card rounded-2xl p-6 border border-border hover:border-emerald-500/30 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Step {i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section id="roles" className="py-16 md:py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Choose your role to get started</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Each role provides a tailored experience within the platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
              const cfg = ROLE_CONFIG[role]
              const Icon = cfg.icon
              const isHovered = hoveredRole === role
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  onMouseEnter={() => setHoveredRole(role)}
                  onMouseLeave={() => setHoveredRole(null)}
                  className="group relative text-left"
                >
                  <div className={`relative bg-background border-2 border-border rounded-2xl p-6 transition-all duration-200
                    ${isHovered ? "border-primary/30 shadow-xl shadow-blue-100/40 scale-[1.02]" : "hover:border-border hover:shadow-lg hover:shadow-border/30"}`}>
                    <div className={`inline-flex p-3 rounded-xl mb-4 transition-all duration-200
                      ${isHovered ? "bg-primary/10 text-primary shadow-sm" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className={`text-lg font-bold mb-1.5 transition-colors duration-200 ${isHovered ? "text-primary" : "text-foreground"}`}>
                      {cfg.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{cfg.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {cfg.features.map((f) => (
                        <span key={f} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">{f}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-sm font-semibold text-foreground/80 group-hover:text-primary transition-colors duration-200">
                        {role === "customer" ? "Sign In" : "Login / Register"}
                      </span>
                      <span className={`inline-flex items-center justify-center size-7 rounded-xl border-2 transition-all duration-200
                        ${isHovered ? "bg-primary/10 border-primary/30 text-primary translate-x-0.5" : "border-border text-muted-foreground group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary"}`}>
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4 shadow-sm">
              <Layers className="size-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Platform Features</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Everything you need to run your retail business</h2>
            <p className="mt-3 text-muted-foreground">From inventory tracking to customer-facing shopping — KhataBox provides a complete toolkit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-blue-100/20 transition-all duration-200">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-200 mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 mb-4 shadow-sm">
              <Zap className="size-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">How It Works</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">From shopkeeper setup to customer order</h2>
            <p className="mt-3 text-muted-foreground">A simple three-step workflow that connects shopkeepers and customers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {STEPS.map((step, i) => (
              <div key={i} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px border-t-2 border-dashed border-border" />
                )}
                <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-primary/10 border border-primary/20 mb-5 shadow-sm">
                  <span className="text-xl font-bold text-primary">{step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10K+", label: "Products Tracked" },
              { value: "500+", label: "Active Stores" },
              { value: "50K+", label: "Orders Processed" },
              { value: "99.9%", label: "Uptime" },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-3xl md:text-4xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-primary-foreground/60 mt-1.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-3">Ready to transform your retail business?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join thousands of businesses using KhataBox to manage inventory, process billing, and grow smarter.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => handleRoleSelect("shopkeeper")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-7 py-3 rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-blue-200/50 hover:shadow-xl active:scale-[0.98]">
              Start as Shopkeeper <ChevronRight className="size-4" />
            </button>
            <button onClick={() => handleRoleSelect("customer")}
              className="inline-flex items-center gap-2 border-2 border-border text-foreground/80 font-semibold px-7 py-3 rounded-xl hover:border-border hover:bg-muted transition-all duration-200 active:scale-[0.98]">
              Start as Customer <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/90 text-muted-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-primary rounded-xl p-1.5">
                  <Boxes className="size-4 text-white" />
                </div>
                <span className="text-base font-bold text-background">KhataBox</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-muted-foreground">
                AI-powered inventory & retail management platform for modern businesses.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 md:col-span-2">
              <div>
                <h4 className="text-xs font-semibold text-background uppercase tracking-wider mb-3">Platform</h4>
                <ul className="space-y-2">
                  {["Features", "How It Works", "Pricing", "FAQ"].map((l) => (
                    <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-background transition-colors duration-200">{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-background uppercase tracking-wider mb-3">Company</h4>
                <ul className="space-y-2">
                  {["About", "Blog", "Contact", "Privacy"].map((l) => (
                    <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-background transition-colors duration-200">{l}</a></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-foreground/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>&copy; 2026 KhataBox. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-background transition-colors duration-200">Terms</a>
              <a href="#" className="hover:text-background transition-colors duration-200">Privacy</a>
              <a href="#" className="hover:text-background transition-colors duration-200">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
