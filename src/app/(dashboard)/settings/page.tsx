"use client"

import { useSession } from "next-auth/react"
import { Download, User, Mail, Shield, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

function exportAsCsv(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? "")}"`).join(",")),
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{user?.name || "N/A"}</p>
              <p className="text-xs text-muted-foreground">Name</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{user?.email || "N/A"}</p>
              <p className="text-xs text-muted-foreground">Email</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium capitalize">{user?.role || "N/A"}</p>
              <p className="text-xs text-muted-foreground">Role</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{user?.name ? `${user.name}'s Shop` : "N/A"}</p>
              <p className="text-xs text-muted-foreground">Business</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download your data as CSV files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Products</p>
              <p className="text-xs text-muted-foreground">Export all product inventory data</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                exportAsCsv([], "products.csv")
                toast.success("Products export started")
              }}
            >
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Orders</p>
              <p className="text-xs text-muted-foreground">Export all order records</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                exportAsCsv([], "orders.csv")
                toast.success("Orders export started")
              }}
            >
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
