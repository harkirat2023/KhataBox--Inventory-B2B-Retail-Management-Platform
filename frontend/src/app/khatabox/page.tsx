"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Boxes, User, Store, Shield, ArrowRight, CheckCircle, Menu, X,
  BarChart3, ShoppingCart, QrCode, Package, Brain,
  ChevronRight, Sparkles, Layers, Zap,
} from "lucide-react"

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

export default function LandingPage() {
  const router = useRouter()
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleRoleSelect(role: Role) {
    router.push(`/login?role=${role}`)
  }

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#roles", label: "Get Started" },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 rounded-xl p-1.5 shadow-sm shadow-blue-200">
              <Boxes className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">KhataBox</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-all duration-200">{l.label}</a>
            ))}
          </div>
          <button className="md:hidden p-2 -mr-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="size-5 text-slate-600" /> : <Menu className="size-5 text-slate-600" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-4 pb-4 space-y-1 border-t border-slate-100 pt-2 bg-white">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">{l.label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-blue-50/30 to-[#F8FAFC]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-blue-100/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-6 shadow-sm">
              <Sparkles className="size-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 tracking-wide uppercase">Inventory & Retail Management</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              The retail platform built for{" "}
              <span className="text-blue-600">modern businesses</span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Manage inventory, process billing, enable QR shopping, and get AI-powered insights — 
              all in one place. No complexity, no hidden costs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => handleRoleSelect("shopkeeper")}
                className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 active:scale-[0.98]"
              >
                Start for Business <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => handleRoleSelect("customer")}
                className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 active:scale-[0.98]"
              >
                Start Shopping <ShoppingCart className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> Smart Inventory</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> Billing & POS</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> QR Shopping</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-green-500" /> AI Analytics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section id="roles" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Choose your role to get started</h2>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">Each role provides a tailored experience within the platform.</p>
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
                  <div className={`relative bg-white border-2 border-slate-200 rounded-2xl p-6 transition-all duration-200
                    ${isHovered ? "border-blue-200 shadow-xl shadow-blue-100/40 scale-[1.02]" : "hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"}`}>
                    <div className={`inline-flex p-3 rounded-xl mb-4 transition-all duration-200
                      ${isHovered ? "bg-blue-50 text-blue-600 shadow-sm" : "bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"}`}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className={`text-lg font-bold mb-1.5 transition-colors duration-200 ${isHovered ? "text-blue-600" : "text-slate-900"}`}>
                      {cfg.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{cfg.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {cfg.features.map((f) => (
                        <span key={f} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">{f}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors duration-200">
                        {role === "customer" ? "Sign In" : "Login / Register"}
                      </span>
                      <span className={`inline-flex items-center justify-center size-7 rounded-xl border-2 transition-all duration-200
                        ${isHovered ? "bg-blue-50 border-blue-200 text-blue-600 translate-x-0.5" : "border-slate-200 text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600"}`}>
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
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4 shadow-sm">
              <Layers className="size-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Platform Features</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to run your retail business</h2>
            <p className="mt-3 text-slate-500">From inventory tracking to customer-facing shopping — KhataBox provides a complete toolkit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/20 transition-all duration-200">
                  <div className="inline-flex p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100/50 transition-colors duration-200 mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-4 shadow-sm">
              <Zap className="size-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">How It Works</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">From shopkeeper setup to customer order</h2>
            <p className="mt-3 text-slate-500">A simple three-step workflow that connects shopkeepers and customers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {STEPS.map((step, i) => (
              <div key={i} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px border-t-2 border-dashed border-slate-200" />
                )}
                <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-blue-50 border border-blue-100 mb-5 shadow-sm">
                  <span className="text-xl font-bold text-blue-600">{step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-600 py-14">
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
                <p className="text-sm text-blue-200 mt-1.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Ready to transform your retail business?</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Join thousands of businesses using KhataBox to manage inventory, process billing, and grow smarter.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => handleRoleSelect("shopkeeper")}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-7 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200/50 hover:shadow-xl active:scale-[0.98]">
              Start as Shopkeeper <ChevronRight className="size-4" />
            </button>
            <button onClick={() => handleRoleSelect("customer")}
              className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 font-semibold px-7 py-3 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 active:scale-[0.98]">
              Start as Customer <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-500 rounded-xl p-1.5">
                  <Boxes className="size-4 text-white" />
                </div>
                <span className="text-base font-bold text-white">KhataBox</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-slate-500">
                AI-powered inventory & retail management platform for modern businesses.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 md:col-span-2">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Platform</h4>
                <ul className="space-y-2">
                  {["Features", "How It Works", "Pricing", "FAQ"].map((l) => (
                    <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Company</h4>
                <ul className="space-y-2">
                  {["About", "Blog", "Contact", "Privacy"].map((l) => (
                    <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">{l}</a></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>&copy; 2026 KhataBox. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors duration-200">Terms</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Privacy</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
