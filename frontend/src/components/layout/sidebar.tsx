"use client"

import { motion } from "framer-motion"
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
  ChevronLeft,
  ChevronRight,
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
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
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
      { label: "Price Analysis", href: "/price-analysis", icon: LineChart, roles: ["admin", "shopkeeper"] },
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

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: { label: string; href: string; icon: React.ElementType }
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  const button = (
    <motion.div
      whileHover={{ translateX: collapsed ? 0 : 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <SidebarMenuButton isActive={active} tooltip={collapsed ? item.label : undefined} asChild href={item.href}>
        <div className={cn(
          "flex items-center justify-center size-4.5 shrink-0 rounded-md transition-colors",
          active ? "text-amber-brand" : "text-muted-foreground group-hover/menu-button:text-foreground"
        )}>
          <Icon className="size-4" />
        </div>
        <span className={cn(
          "transition-colors sidebar-text-label",
          collapsed && "hidden",
          active ? "text-amber-brand font-semibold" : "text-muted-foreground group-hover/menu-button:text-foreground"
        )}>{item.label}</span>
      </SidebarMenuButton>
    </motion.div>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full">
          {button}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}

export function AppSidebar() {
  const pathname = usePathname()
  const { role } = useRole()
  const { activeStore, setActiveStore } = useStoreContext()
  const [stores, setStores] = useState<Store[]>([])
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingStore, setRenamingStore] = useState<{ id: number; name: string } | null>(null)
  const navGroups = role === "customer" ? customerNavGroups : staffNavGroups
  const { open, isMobile, toggleSidebar, setOpenMobile } = useSidebar()
  const collapsed = !isMobile && !open

  useEffect(() => {
    if (role && ["admin", "shopkeeper"].includes(role)) {
      clientApi.get<Store[]>("/api/v1/stores/").then((data) => {
        setStores(data)
        if (data.length > 0 && !activeStore.id) {
          setActiveStore({ id: data[0].id, name: data[0].name })
        }
      }).catch(() => {})
    }
  }, [role, activeStore.id, setActiveStore])

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar className="max-h-dvh overflow-y-auto border-r border-sidebar-border">
      <SidebarHeader className={cn("p-4 pb-2", collapsed && "px-2 py-3")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild href="/dashboard" onClick={handleNavClick} className={cn("h-12", collapsed && "justify-center")}>
              <div className={cn("flex items-center gap-3", collapsed && "flex-col gap-1")}>
                <div className="flex items-center justify-center size-9 rounded-xl bg-amber-brand/10 shrink-0">
                  <Boxes className="size-5 text-amber-brand" />
                </div>
                <span className={cn("font-semibold text-lg tracking-tight text-foreground sidebar-text-label", collapsed && "hidden")}>KhataBox</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {role && ["admin", "shopkeeper"].includes(role) && !collapsed && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sidebar-text-label">Store</span>
              {activeStore.id && (
                <button
                  onClick={() => {
                    const store = stores.find((s) => s.id === activeStore.id)
                    if (store) {
                      setRenamingStore({ id: store.id, name: store.name })
                      setRenameDialogOpen(true)
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
              <SelectTrigger className="w-full h-9 text-sm rounded-lg border-border bg-card">
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

      <SidebarContent className={cn("px-3 py-1", collapsed && "px-1")}>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest sidebar-text-label">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <div key={item.href} onClick={handleNavClick}>
                      <NavItem item={item} active={active} collapsed={collapsed} />
                    </div>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className={cn("p-4 pt-2 border-t border-sidebar-border", collapsed && "px-0 py-3")}>
        {!isMobile && (
          <div className={cn("flex", collapsed ? "justify-center" : "justify-between items-center")}>
            <span className={cn("text-[11px] text-muted-foreground/50 text-center font-mono sidebar-text-label", collapsed && "hidden")}>KhataBox v1.0</span>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("rounded-lg text-muted-foreground hover:text-foreground", collapsed && "size-9")}
                  onClick={toggleSidebar}
                >
                  {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
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
