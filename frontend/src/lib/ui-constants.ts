// Status configuration for orders
export const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "outline", color: "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-white" },
  confirmed: { label: "Confirmed", variant: "default", color: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white" },
  counter: { label: "Counter", variant: "secondary", color: "bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-white" },
  processing: { label: "Processing", variant: "outline", color: "bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600 dark:text-white" },
  completed: { label: "Completed", variant: "default", color: "bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 dark:text-white" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white" },
  rejected: { label: "Rejected", variant: "destructive", color: "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white" },
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
