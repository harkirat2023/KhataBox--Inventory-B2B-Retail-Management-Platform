"use client"

import { motion } from "framer-motion"
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
  if (role === "shopkeeper") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-border dark:border-zinc-800 backdrop-blur-xl">
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
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive ? "text-amber-brand bg-amber-brand/10" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-5 transition-all duration-200", isActive && "scale-110")} />
                </div>
                {item.badge && cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-brand text-[10px] font-bold text-white rounded-full flex items-center justify-center leading-none shadow-sm"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </motion.span>
                )}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] leading-tight truncate max-w-full transition-all duration-200",
                  isActive ? "text-amber-brand font-semibold" : "text-muted-foreground"
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
