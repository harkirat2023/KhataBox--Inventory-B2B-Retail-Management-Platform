"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Plus, Minus, Check, X, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

const STORE_TYPE_LABELS: Record<string, string> = {
  kirana: "Kirana / General Store",
  supermart: "Supermart / Hypermarket",
  pharmacy: "Pharmacy / Medical Store",
  electronics: "Electronics",
  clothing: "Clothing / Fashion",
  restaurant: "Restaurant / Food",
  other: "Other",
}

interface SeedProduct {
  id: number
  store_type: string
  name: string
  sku_prefix: string
  category: string
  default_selling_price: number
  default_cost_price: number
}

interface SelectedItem {
  seed_product_id: number
  name: string
  quantity: number
}

function SetupInventoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeType = searchParams.get("store_type") || "kirana"

  const [products, setProducts] = useState<SeedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [defaultQty, setDefaultQty] = useState(10)
  const [selected, setSelected] = useState<Map<number, SelectedItem>>(new Map())
  const [categories, setCategories] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const data = await clientApi.get<SeedProduct[]>(
          `/api/v1/seed-products?store_type=${storeType}`
        )
        setProducts(data)
        const cats = [...new Set(data.map((p) => p.category))]
        setCategories(cats)
        setExpandedCategories(new Set(cats))
      } catch (err) {
        toast.error("Failed to load seed products")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [storeType])

  function toggleProduct(sp: SeedProduct) {
    const next = new Map(selected)
    if (next.has(sp.id)) {
      next.delete(sp.id)
    } else {
      next.set(sp.id, { seed_product_id: sp.id, name: sp.name, quantity: defaultQty })
    }
    setSelected(next)
  }

  function updateQty(id: number, qty: number) {
    const next = new Map(selected)
    const item = next.get(id)
    if (item) {
      next.set(id, { ...item, quantity: Math.max(1, qty) })
      setSelected(next)
    }
  }

  function selectAllInCategory(category: string, select: boolean) {
    const catProducts = products.filter((p) => p.category === category)
    const next = new Map(selected)
    for (const sp of catProducts) {
      if (select) {
        next.set(sp.id, { seed_product_id: sp.id, name: sp.name, quantity: defaultQty })
      } else {
        next.delete(sp.id)
      }
    }
    setSelected(next)
  }

  function isCategoryFullySelected(category: string): boolean {
    const catProducts = products.filter((p) => p.category === category)
    return catProducts.length > 0 && catProducts.every((p) => selected.has(p.id))
  }

  function isCategoryPartiallySelected(category: string): boolean {
    return products.filter((p) => p.category === category).some((p) => selected.has(p.id))
  }

  function groupByCategory(products: SeedProduct[]): Record<string, SeedProduct[]> {
    const groups: Record<string, SeedProduct[]> = {}
    for (const p of products) {
      if (!groups[p.category]) groups[p.category] = []
      groups[p.category].push(p)
    }
    return groups
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      toast.error("Please select at least one product")
      return
    }
    setSubmitting(true)
    try {
      const items = Array.from(selected.values()).map(({ seed_product_id, quantity }) => ({
        seed_product_id,
        quantity,
      }))
      const result = await clientApi.post<{ created: number; products: { id: number; name: string; sku: string }[] }>(
        "/api/v1/seed-products/bulk-add",
        { items }
      )
      toast.success(`${result.created} products added to inventory!`)
      router.push("/dashboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add products")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading seed products...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No seed products found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            No pre-configured products are available for &ldquo;{STORE_TYPE_LABELS[storeType] || storeType}&rdquo;.
          </p>
          <Button onClick={() => router.push("/inventory")} variant="outline">
            Go to Inventory
          </Button>
        </div>
      </div>
    )
  }

  const grouped = groupByCategory(products)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Package className="size-6 text-primary" />
          Set Up Your Inventory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {STORE_TYPE_LABELS[storeType] || storeType} &mdash; Select products to add to your inventory
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-foreground/80">Default Quantity:</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => setDefaultQty((q) => Math.max(1, q - 5))}
            >
              <Minus className="size-4" />
            </Button>
            <Input
              type="number"
              value={defaultQty}
              onChange={(e) => setDefaultQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 h-9 text-center rounded-lg"
              min={1}
            />
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => setDefaultQty((q) => q + 5)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            Applies to newly selected items
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {categories.map((category) => {
          const catProducts = grouped[category]
          const allSelected = isCategoryFullySelected(category)
          const someSelected = isCategoryPartiallySelected(category)
          const isExpanded = expandedCategories.has(category)

          return (
            <div key={category} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const next = new Set(expandedCategories)
                      if (isExpanded) next.delete(category)
                      else next.add(category)
                      setExpandedCategories(next)
                    }}
                    className="text-xs font-semibold text-foreground/80 uppercase tracking-wider"
                  >
                    {isExpanded ? "▾" : "▸"} {category}
                  </button>
                  <span className="text-xs text-muted-foreground">({catProducts.length})</span>
                </div>
                <button
                  onClick={() => selectAllInCategory(category, !allSelected)}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              </div>

              {isExpanded && (
                <div className="divide-y divide-border">
                  {catProducts.map((sp) => {
                    const isSelected = selected.has(sp.id)
                    const item = selected.get(sp.id)
                    return (
                      <div
                        key={sp.id}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <button
                          onClick={() => toggleProduct(sp)}
                          className={`flex items-center justify-center size-5 rounded border-2 shrink-0 transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{sp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{sp.default_selling_price} &middot; Cost: ₹{sp.default_cost_price}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7 rounded-lg"
                              onClick={() => updateQty(sp.id, (item?.quantity || defaultQty) - 1)}
                              disabled={(item?.quantity || defaultQty) <= 1}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item?.quantity || defaultQty}
                              onChange={(e) => updateQty(sp.id, parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-center text-xs rounded-lg"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7 rounded-lg"
                              onClick={() => updateQty(sp.id, (item?.quantity || defaultQty) + 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.size} product{selected.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Skip
            </Button>
            <Button variant="outline" onClick={() => router.push("/inventory")}>
              <X className="size-4 mr-1.5" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || selected.size === 0}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Package className="size-4 mr-1.5" />
                  Add to Inventory
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SetupInventoryLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Package className="size-10 text-muted-foreground animate-pulse mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function SetupInventoryPage() {
  return (
    <Suspense fallback={<SetupInventoryLoading />}>
      <SetupInventoryContent />
    </Suspense>
  )
}
