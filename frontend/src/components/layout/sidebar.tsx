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
  History,
  ChevronRight,
  Pencil,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useRole } from "@/components/auth/role-guard"
import { useStoreContext } from "@/lib/store-context"
import { clientApi } from "@/lib/client-api"
import { RenameStoreDialog } from "./rename-store-dialog"

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
    label: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "shopkeeper"] },
      { label: "Movements", href: "/inventory/movements", icon: Package, roles: ["admin", "shopkeeper"] },
      { label: "Scan", href: "/inventory/scan", icon: Camera, roles: ["admin", "shopkeeper"] },
      { label: "QR Labels", href: "/qr-labels", icon: Printer, roles: ["admin", "shopkeeper"] },
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
    label: "B2B",
    items: [
      { label: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin", "shopkeeper"] },
      { label: "Purchase Orders", href: "/purchase-orders", icon: FileText, roles: ["admin", "shopkeeper"] },
      { label: "Stock Transfers", href: "/transfers", icon: ArrowLeftRight, roles: ["admin", "shopkeeper"] },
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
      { label: "Stores", href: "/stores", icon: Building2, roles: ["admin"] },
      { label: "Notifications", href: "/notifications", icon: Bell, roles: ["admin"] },
      { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
      { label: "Users", href: "/admin/users", icon: Shield, roles: ["admin"] },
    ],
  },
]

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

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useRole()
  const { activeStore, setActiveStore } = useStoreContext()
  const [stores, setStores] = useState<Store[]>([])
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingStore, setRenamingStore] = useState<{ id: number; name: string } | null>(null)
  const navGroups = role === "customer" ? customerNavGroups : staffNavGroups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(role === "customer" ? ["Shop", "Account"] : ["Dashboard", "B2C", "B2B", "Inventory", "Analytics", "Administration"]))

  useEffect(() => {
    if (role && ["admin", "shopkeeper"].includes(role)) {
      clientApi.get<Store[]>("/api/v1/stores/").then(setStores).catch(() => {})
    }
  }, [role])

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => role && item.roles.includes(role))
  })).filter(group => group.items.length > 0)

  const isActiveRoute = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <aside className="hidden lg:flex flex-col w-[260px] border-r bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-[72px] px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
          <Boxes className="size-5 text-primary" />
        </div>
        <span className="font-semibold text-lg tracking-tight">KhataBox</span>
      </div>

      {/* Store Selector */}
      {role && ["admin", "shopkeeper"].includes(role) && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-1.5 ml-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Active Store
            </label>
            {activeStore.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const store = stores.find((s) => s.id === activeStore.id)
                  if (store) {
                    setRenamingStore({ id: store.id, name: store.name })
                    setRenameDialogOpen(true)
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Rename Store"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </div>
          <Select
            value={activeStore.id ? String(activeStore.id) : ""}
            onValueChange={(val) => {
              const store = stores.find((s) => String(s.id) === val)
              setActiveStore(store ? { id: store.id, name: store.name } : { id: null, name: null })
            }}
          >
            <SelectTrigger className="w-full h-8 text-sm rounded-lg border-sidebar-border bg-sidebar-accent/50">
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

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-none">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label)
          return (
            <div key={group.label} className="mb-0.5">
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-md",
                  "hover:bg-sidebar-accent/50"
                )}
              >
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform duration-200",
                    isExpanded ? "" : "-rotate-90"
                  )}
                />
                {group.label}
              </button>
              {isExpanded && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = isActiveRoute(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 ml-1 rounded-lg text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "")} />
                        <span>{item.label}</span>
                        {active && (
                          <span className="ml-auto size-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">KhataBox v1.0</p>
      </div>

      {renamingStore && (
        <RenameStoreDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          store={renamingStore}
          onRenamed={(newName) => {
            setStores((prev) => prev.map((s) => s.id === renamingStore.id ? { ...s, name: newName } : s))
            if (activeStore.id === renamingStore.id) {
              setActiveStore({ id: renamingStore.id, name: newName })
            }
          }}
        />
      )}
    </aside>
  )
}