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
  Pencil,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
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
import { RenameStoreDialog } from "./rename-store-dialog"

interface Store {
  id: number
  name: string
}

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
      { label: "Home", href: "/customer", icon: LayoutDashboard, roles: ["customer"] },
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

export function AppSidebar() {
  const pathname = usePathname()
  const { role } = useRole()
  const { activeStore, setActiveStore } = useStoreContext()
  const [stores, setStores] = useState<Store[]>([])
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingStore, setRenamingStore] = useState<{ id: number; name: string } | null>(null)
  const navGroups = role === "customer" ? customerNavGroups : staffNavGroups

  useEffect(() => {
    if (role && ["admin", "shopkeeper"].includes(role)) {
      clientApi.get<Store[]>("/api/v1/stores/").then(setStores).catch(() => {})
    }
  }, [role])

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:!p-0" asChild href="/dashboard">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
                <Boxes className="size-5 text-primary" />
              </div>
              <span className="font-semibold text-lg tracking-tight group-data-[collapsible=icon]:hidden">KhataBox</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {role && ["admin", "shopkeeper"].includes(role) && (
          <div className="px-1 pt-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Store</span>
              {activeStore.id && (
                <button
                  onClick={() => {
                    const store = stores.find((s) => s.id === activeStore.id)
                    if (store) {
                      setRenamingStore({ id: store.id, name: store.name })
                      setRenameDialogOpen(true)
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
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
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={active} tooltip={item.label} asChild href={item.href}>
                            <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "")} />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1">
          <p className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">KhataBox v1.0</p>
        </div>
      </SidebarFooter>

      {renamingStore && (
        <RenameStoreDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          store={renamingStore}
          onRenamed={(newName) => {
            setStores((prev) => prev.map((s) => (s.id === renamingStore.id ? { ...s, name: newName } : s)))
            if (activeStore.id === renamingStore.id) {
              setActiveStore({ id: renamingStore.id, name: newName })
            }
          }}
        />
      )}
    </Sidebar>
  )
}
