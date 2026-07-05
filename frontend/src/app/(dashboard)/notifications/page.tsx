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
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
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
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading..." : unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-white">
            <Filter className="size-3.5 text-slate-400 ml-1" />
            {typeLabels.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  typeFilter === t.value
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5" onClick={markAllAsRead}>
              <CheckCheck className="size-4 mr-2" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-3">
          {loading && (
            <div className="space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="size-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-slate-100 mb-4">
                <Bell className="size-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">No notifications yet</p>
              <p className="text-sm text-slate-500 mt-1">You'll see notifications here when something needs your attention.</p>
            </div>
          )}
          {notifications.map((notification, i) => {
            const config = typeConfig[notification.type]
            const Icon = config.icon
            return (
              <div
                key={notification.id}
                className={cn(
                  "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 transition-all duration-200 cursor-pointer",
                  !notification.is_read && "ring-1 ring-blue-100"
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("flex items-center justify-center size-10 rounded-xl shrink-0", config.color)}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", !notification.is_read ? "font-semibold text-slate-900" : "text-slate-700")}>{notification.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{notification.message}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="size-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{timeAgo(notification.created_at)}</span>
                    </div>
                  </div>
                  {!notification.is_read && <span className="size-2 rounded-full bg-blue-600 shrink-0 mt-2" />}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
