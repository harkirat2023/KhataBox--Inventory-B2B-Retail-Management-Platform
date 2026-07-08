// Status configuration for orders
export const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "outline", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  confirmed: { label: "Confirmed", variant: "default", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  counter: { label: "Counter", variant: "secondary", color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  processing: { label: "Processing", variant: "outline", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800" },
  completed: { label: "Completed", variant: "default", color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  rejected: { label: "Rejected", variant: "destructive", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
}

// Status dot colors for badges
export const STATUS_DOT_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  counter: "bg-orange-500",
  processing: "bg-purple-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
  rejected: "bg-red-500",
}

// Quick action buttons for dashboard
export const DASHBOARD_QUICK_ACTIONS = [
  { label: "Create Product", href: "/inventory", icon: "Package", query: "add" },
  { label: "Generate Bill", href: "/billing", icon: "Receipt" },
  { label: "Purchase Order", href: "/purchase-orders", icon: "Truck", query: "new" },
  { label: "Scan Inventory", href: "/inventory/scan", icon: "Camera" },
  { label: "View Orders", href: "/orders", icon: "ShoppingCart" },
]

// Metric card configurations
export const METRIC_CARD_STYLES = {
  default: {
    gradient: "from-primary/5 to-transparent",
    iconBg: "bg-primary/10 text-primary",
  },
  success: {
    gradient: "from-green-500/5 to-transparent",
    iconBg: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  },
  warning: {
    gradient: "from-amber-500/5 to-transparent",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  danger: {
    gradient: "from-red-500/5 to-transparent",
    iconBg: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
}

// Table column sort directions
export type SortDirection = "asc" | "desc" | null

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100]
