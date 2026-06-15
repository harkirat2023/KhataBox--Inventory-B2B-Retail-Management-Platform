"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, ShoppingCart, ShoppingBag, ScanLine, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRole } from "@/components/auth/role-guard"
import { useCustomerCartStore } from "@/store/customer-cart"

export function BottomNav() {
  const pathname = usePathname()
  const { role } = useRole()
  const { items } = useCustomerCartStore()

  // Staff navigation items
  const staffItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "shopkeeper"] },
    { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "shopkeeper"] },
    { label: "Orders", href: "/orders", icon: ShoppingCart, roles: ["admin", "shopkeeper"] },
    { label: "Billing", href: "/billing", icon: Receipt, roles: ["admin", "shopkeeper"] },
  ]

  // Customer navigation items
  const customerItems = [
    { label: "Home", href: "/", icon: LayoutDashboard, roles: ["customer"] },
    { label: "Catalog", href: "/catalog", icon: ShoppingBag, roles: ["customer"] },
    { label: "My Orders", href: "/my-orders", icon: ShoppingCart, roles: ["customer"] },
  ]

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Choose navigation based on role
  const baseItems = role === "customer" ? customerItems : staffItems

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {baseItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1"
            >
              <div className="relative">
                <Icon
                  className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground")}
                />
                {item.href === "/catalog" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-primary text-[10px] text-white rounded-full flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight truncate max-w-full",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Scan button only for customer on mobile */}
      {role === "customer" && (
        <Link
          href="/scan"
          className="absolute -top-5 right-4 size-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
        >
          <ScanLine className="size-6" />
        </Link>
      )}
    </nav>
  )
}
