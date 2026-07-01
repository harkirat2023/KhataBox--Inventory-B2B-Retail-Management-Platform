"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Package,
  AlertTriangle,
  CreditCard,
  Lightbulb,
  CheckCheck,
  Clock,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { clientApi } from "@/lib/client-api"

type NotificationType = "low_stock" | "expiry" | "payment" | "ai_recommendation"

interface Notification {
  id: number
  user_id: number
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  reference_id: number | null
  created_at: string
}

const typeConfig: Record<NotificationType, { icon: typeof Package; color: string; label: string }> = {
  low_stock: { icon: AlertTriangle, color: "text-amber-600 bg-amber-100", label: "Low Stock" },
  expiry: { icon: AlertTriangle, color: "text-red-600 bg-red-100", label: "Expiry" },
  payment: { icon: CreditCard, color: "text-blue-600 bg-blue-100", label: "Payment" },
  ai_recommendation: { icon: Lightbulb, color: "text-green-600 bg-green-100", label: "AI Insight" },
}

const typeLabels: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "low_stock", label: "Low Stock" },
  { value: "expiry", label: "Expiry" },
  { value: "payment", label: "Payment" },
  { value: "ai_recommendation", label: "AI Insight" },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")

  const loadNotifications = useCallback(async () => {
    try {
      const params = typeFilter ? `?type=${typeFilter}` : ""
      const data = await clientApi.get<Notification[]>(`/api/v1/notifications/${params}`)
      setNotifications(data)
    } catch (err) {
      console.error("Failed to load notifications", err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = async (id: number) => {
    try {
      await clientApi.patch(`/api/v1/notifications/${id}/read`, {})
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (err) {
      console.error("Failed to mark as read", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await clientApi.patch("/api/v1/notifications/mark-all-read", {})
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success("All notifications marked as read")
    } catch (err) {
      console.error("Failed to mark all as read", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading..." : unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Filter className="size-3.5 text-muted-foreground ml-1" />
            {typeLabels.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  typeFilter === t.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="size-4 mr-2" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-2">
          {loading && (
            <p className="text-center text-muted-foreground py-12">Loading notifications...</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No notifications yet.</p>
          )}
          {notifications.map((notification, i) => {
            const config = typeConfig[notification.type]
            const Icon = config.icon
            return (
              <div key={notification.id}>
                <div
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer",
                    notification.is_read ? "bg-background" : "bg-muted/50",
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn("flex items-center justify-center size-10 rounded-full shrink-0", config.color)}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", !notification.is_read && "font-semibold")}>{notification.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{timeAgo(notification.created_at)}</span>
                    </div>
                  </div>
                  {!notification.is_read && <span className="size-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
                {i < notifications.length - 1 && <Separator />}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
