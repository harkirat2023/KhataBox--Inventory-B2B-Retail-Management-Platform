"use client"

export default function B2COrdersPage() {
  // Disabled: B2C orders moved into /orders.
  // Keep this route for backward compatibility.
  return (
    <div className="p-6 text-foreground/80">
      B2C Orders are now managed in <a className="underline" href="/orders">/orders</a>.
    </div>
  )
}

