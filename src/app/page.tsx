import Link from "next/link"
import {
  Package,
  QrCode,
  Receipt,
  ShoppingCart,
  Truck,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
  Building2,
  ArrowRight,
  Mail,
  Phone,
} from "lucide-react"

const features = [
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track stock levels across multiple stores with real-time updates and low-stock alerts.",
  },
  {
    icon: QrCode,
    title: "QR Product System",
    description: "Generate unique QR codes for products. Customers scan to view details and order instantly.",
  },
  {
    icon: Receipt,
    title: "Billing & GST",
    description: "Generate professional bills with GST support. Print or digital receipts for customers.",
  },
  {
    icon: ShoppingCart,
    title: "Customer Ordering",
    description: "Customers browse catalog, scan products, and place orders through QR codes.",
  },
  {
    icon: Truck,
    title: "Supplier Management",
    description: "Manage supplier contacts, track purchase orders, and maintain supplier catalogs.",
  },
  {
    icon: TrendingUp,
    title: "Forecasting",
    description: "AI-powered demand forecasting to predict inventory needs accurately.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Comprehensive business insights with sales tracking and inventory reports.",
  },
  {
    icon: ArrowLeftRight,
    title: "Stock Transfers",
    description: "Transfer inventory between stores with full tracking and audit trails.",
  },
  {
    icon: Building2,
    title: "Multi Store Support",
    description: "Manage multiple store locations from a single dashboard with store-level analytics.",
  },
]

const shopkeeperSteps = [
  { step: 1, title: "Add Product", description: "Create products with details and pricing" },
  { step: 2, title: "Generate QR", description: "Print and attach QR codes to products" },
  { step: 3, title: "Manage Inventory", description: "Track stock levels and set reorder alerts" },
  { step: 4, title: "Receive Orders", description: "Process customer orders from QR scans" },
  { step: 5, title: "Generate Bills", description: "Create professional bills with GST" },
]

const customerSteps = [
  { step: 1, title: "Scan QR", description: "Scan product QR code with phone" },
  { step: 2, title: "Add To Cart", description: "Select quantity and add to cart" },
  { step: 3, title: "Place Order", description: "Confirm and submit order" },
  { step: 4, title: "Pay", description: "Pay online or at store" },
  { step: 5, title: "Receive Receipt", description: "Get digital or printed receipt" },
]

const dashboardCards = [
  { title: "Sales Tracking", value: "₹2.4L", label: "this month", color: "bg-blue-50 border-blue-200" },
  { title: "Inventory Insights", value: "1,240", label: "products", color: "bg-green-50 border-green-200" },
  { title: "Demand Forecasting", value: "94%", label: "accuracy", color: "bg-purple-50 border-purple-200" },
  { title: "Business Reports", value: "12", label: "active reports", color: "bg-amber-50 border-amber-200" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-[#0F172A]">KhataBox</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login?role=customer"
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                Customer Login
              </Link>
              <Link
                href="/login?role=shopkeeper"
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                Shopkeeper Login
              </Link>
              <Link
                href="/login?role=admin"
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white border-b border-[#E2E8F0] py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F172A] leading-tight animate-fade-in">
              Smart Inventory, Billing and QR Commerce Platform for Indian Businesses
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-[#64748B] max-w-2xl mx-auto animate-slide-up">
              Manage products, inventory, suppliers, billing, forecasting and customer orders from one unified platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                href="/login?role=customer"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors duration-250"
              >
                Customer Login
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/login?role=shopkeeper"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors duration-250"
              >
                Shopkeeper Login
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/login?role=admin"
                className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-[#E2E8F0] text-[#0F172A] font-semibold rounded-lg hover:bg-[#F8FAFC] transition-colors duration-250"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A]">Powerful Features</h2>
            <p className="mt-4 text-[#64748B]">Everything you need to run your business efficiently</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:shadow-lg transition-all duration-250 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-12 h-12 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">{feature.title}</h3>
                  <p className="mt-2 text-sm text-[#64748B]">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white border-t border-b border-[#E2E8F0] py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A]">How It Works</h2>
            <p className="mt-4 text-[#64748B]">Simple workflows for shopkeepers and customers</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Shopkeeper Flow */}
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-6">Shopkeeper Flow</h3>
              <div className="space-y-4">
                {shopkeeperSteps.map((step, index) => (
                  <div key={step.step} className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${index * 75}ms` }}>
                    <div className="w-8 h-8 bg-[#2563EB] text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {step.step}
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">{step.title}</p>
                      <p className="text-sm text-[#64748B]">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Customer Flow */}
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-6">Customer Flow</h3>
              <div className="space-y-4">
                {customerSteps.map((step, index) => (
                  <div key={step.step} className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${index * 75}ms` }}>
                    <div className="w-8 h-8 bg-[#16A34A] text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {step.step}
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">{step.title}</p>
                      <p className="text-sm text-[#64748B]">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Showcase */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A]">Analytics Dashboard</h2>
            <p className="mt-4 text-[#64748B]">Powerful insights at your fingertips</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardCards.map((card, index) => (
              <div
                key={card.title}
                className={`${card.color} border rounded-xl p-6 animate-fade-in`}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <p className="text-sm text-[#64748B]">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">{card.value}</p>
                <p className="mt-1 text-sm text-[#64748B]">{card.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-[#0F172A]">KhataBox</span>
              </Link>
              <p className="mt-4 text-sm text-[#64748B]">
                Smart inventory, billing and QR commerce platform for Indian businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[#0F172A] mb-4">About</h4>
              <ul className="space-y-2 text-sm text-[#64748B]">
                <li><Link href="#" className="hover:text-[#0F172A] transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-[#0F172A] transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-[#0F172A] transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#0F172A] mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-[#64748B]">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  support@khatabox.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +91 98765 43210
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#0F172A] mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[#64748B]">
                <li><Link href="#" className="hover:text-[#0F172A] transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-[#0F172A] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[#E2E8F0] text-center text-sm text-[#64748B]">
            <p>&copy; {new Date().getFullYear()} KhataBox. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}