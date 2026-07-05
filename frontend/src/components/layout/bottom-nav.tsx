"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Store, ShoppingBag, ShoppingCart, Clock, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRole } from "@/components/auth/role-guard"
import { useCustomerCartStore } from "@/store/customer-cart"

export function BottomNav() {
  const pathname = usePathname()
  const { role } = useRole()
  const { items } = useCustomerCartStore()

  const customerItems = [
    { label: "Home", href: "/customer", icon: Store },
    { label: "Catalog", href: "/catalog", icon: ShoppingBag },
    { label: "Cart", href: "/cart", icon: ShoppingCart, badge: true },
    { label: "Orders", href: "/my-orders", icon: Clock },
    { label: "Scan", href: "/scan", icon: ScanLine },
  ]

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (role === "customer" && pathname.startsWith("/payment-simulate")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {customerItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative group"
            >
              <div className="relative">
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive ? "text-blue-600 bg-blue-50" : "text-slate-400 group-hover:text-slate-600"
                  )}
                >
                  <Icon className={cn("size-5 transition-all duration-200", isActive && "scale-110")} />
                </div>
                {item.badge && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center leading-none shadow-sm shadow-blue-200">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight truncate max-w-full transition-all duration-200",
                  isActive ? "text-blue-600 font-semibold" : "text-slate-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
