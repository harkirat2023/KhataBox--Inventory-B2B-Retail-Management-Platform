"use client"

import { X, Plus, Minus, Trash2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCartStore } from "@/store/cart"

interface CustomerCartProps {
  onCheckout?: () => void
  compact?: boolean
}

export function CustomerCart({ onCheckout, compact = false }: CustomerCartProps) {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore()

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (items.length === 0) {
    return compact ? (
      <div className="p-3 text-center text-muted-foreground text-sm">
        <ShoppingCart className="size-8 mx-auto mb-2 opacity-20" />
        <p>Cart is empty</p>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ShoppingCart className="size-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <p className="text-sm mt-1">Scan products to add them to your cart</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.product_id} className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.sku}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
            >
              <Plus className="size-3" />
            </Button>
          </div>

          <div className="text-right w-20">
            <p className="font-medium text-sm">₹{(item.unit_price * item.quantity).toFixed(2)}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => removeItem(item.product_id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}

      {!compact && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>GST (18%):</span>
            <span>₹{(total * 0.18).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total:</span>
            <span>₹{(total * 1.18).toFixed(2)}</span>
          </div>
          {onCheckout && (
            <Button
              className="w-full mt-4"
              size="lg"
              onClick={onCheckout}
            >
              Proceed to Checkout ({itemCount} item{itemCount !== 1 ? "s" : ""})
            </Button>
          )}
        </div>
      )}
    </div>
  )
}