"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { ShoppingCart } from "lucide-react"

const CartContent = dynamic(() => import("./cart-content").then(mod => ({ default: mod.CartContent })), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
      <div className="text-center">
        <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center animate-pulse">
          <ShoppingCart className="size-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    </div>
  ),
  ssr: false,
})

export default function CustomerCartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
          <div className="text-center">
            <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center animate-pulse">
              <ShoppingCart className="size-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground">Loading cart...</p>
          </div>
        </div>
      }
    >
      <CartContent />
    </Suspense>
  )
}
