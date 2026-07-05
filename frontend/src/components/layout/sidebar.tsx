"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  ScanLine,
  Truck,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  Boxes,
  Bell,
  Users,
  LineChart,
  Shield,
  Building2,
  Printer,
  ArrowLeftRight,
  Camera,
  ChevronDown,
  ChevronRight,
  History,
  Plus,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useRole } from "@/components/auth/role-guard"
import { useStoreContext } from "@/lib/store-context"
import { clientApi } from "@/lib/client-api"

interface Store {
  id: number
  name: string
}

// Navigation groups for admin/shopkeeper
const staffNavGroups = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "shopkeeper"] },
    ],
  },
  {
    label: "B2C",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingCart, roles: ["admin", "shopkeeper"] },
      { label: "Billing", href: "/billing", icon: Receipt, roles: ["admin", "shopkeeper"] },
      { label: "Khata", href: "/customers", icon: Users, roles: ["admin", "shopkeeper"] },
      { label: "Order History", href: "/order-history", icon: History, roles: ["admin", "shopkeeper"] },
    ],
  },
  {
    label: "B2C Orders",
    items: [
      { label: "New Orders", href: "/b2c-orders", icon: ShoppingCart, roles: ["admin", "shopkeeper"] },
      { label: "Order History", href: "/b2c-order-history", icon: History, roles: ["admin", "shopkeeper"] },
    ],
  },
  {
    label: "B2B",
    items: [
      { label: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin", "shopkeeper"] },
      { label: "Purchase Orders", href: "/purchase-orders", icon: FileText, roles: ["admin", "shopkeeper"] },
      { label: "Stock Transfers", href: "/transfers", icon: ArrowLeftRight, roles: ["admin", "shopkeeper"] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "shopkeeper"] },
      { label: "Movements", href: "/inventory/movements", icon: Package, roles: ["admin", "shopkeeper"] },
      { label: "Scan", href: "/inventory/scan", icon: Camera, roles: ["admin", "shopkeeper"] },
      { label: "QR Labels", href: "/qr-labels", icon: Printer, roles: ["admin", "shopkeeper"] },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Forecasting", href: "/forecasting", icon: TrendingUp, roles: ["admin", "shopkeeper"] },
      { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "shopkeeper"] },
      { label: "Price Analysis", href: "/suppliers/price-analysis", icon: LineChart, roles: ["admin", "shopkeeper"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Stores", href: "/stores", icon: Building2, roles: ["admin", "shopkeeper"] },
      { label: "Notifications", href: "/notifications", icon: Bell, roles: ["admin", "shopkeeper"] },
      { label: "Settings", href: "/settings", icon: Settings, roles: ["admin", "shopkeeper"] },
      { label: "Admin", href: "/admin/users", icon: Shield, roles: ["admin"] },
    ],
  },
]

// Navigation groups for customer
const customerNavGroups = [
  {
    label: "Shop",
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard, roles: ["customer"] },
      { label: "Quick Scan", href: "/scan", icon: ScanLine, roles: ["customer"] },
      { label: "Catalog", href: "/catalog", icon: ShoppingBag, roles: ["customer"] },
      { label: "Cart", href: "/cart", icon: ShoppingCart, roles: ["customer"] },
      { label: "My Orders", href: "/my-orders", icon: Package, roles: ["customer"] },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, roles: ["customer"] },
      { label: "Profile", href: "/settings", icon: Settings, roles: ["customer"] },
    ],
  },
]

// Combined navigation groups - role filtering applied at render time
const staffNav = staffNavGroups

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useRole()
  const { activeStore, setActiveStore } = useStoreContext()
  const [stores, setStores] = useState<Store[]>([])
  // Select navigation groups based on role
  const navGroups = role === "customer" ? customerNavGroups : staffNav
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(role === "customer" ? ["Shop", "Account"] : ["Dashboard", "B2C", "B2C Orders"]))

  useEffect(() => {
    if (role && ["admin", "shopkeeper"].includes(role)) {
      clientApi.get<Store[]>("/api/v1/stores/").then(setStores).catch(() => {})
    }
  }, [role])

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => role && item.roles.includes(role))
  })).filter(group => group.items.length > 0)

  return (
    <aside className="hidden lg:flex flex-col w-[260px] border-r bg-sidebar shrink-0">
      <div className="flex items-center gap-2 h-[72px] px-6 border-b">
        <Boxes className="size-6 text-primary" />
        <span className="font-semibold text-lg">KhataBox</span>
      </div>
      {role && ["admin", "shopkeeper"].includes(role) && (
        <div className="px-4 py-3 border-b">
          <label className="text-xs text-muted-foreground mb-1 block">Active Store</label>
          <Select
            value={activeStore.id ? String(activeStore.id) : ""}
            onValueChange={(val) => {
              const store = stores.find((s) => String(s.id) === val)
              setActiveStore(store ? { id: store.id, name: store.name } : { id: null, name: null })
            }}
          >
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Stores</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label)
          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {group.label}
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 ml-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground text-center">KhataBox v1.0</div>
    </aside>
  )
}
