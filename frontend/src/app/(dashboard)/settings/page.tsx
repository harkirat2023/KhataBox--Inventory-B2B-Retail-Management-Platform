"use client"

import { useUser } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Download, User, Mail, Shield, Building2, Settings, Sun, Moon } from "lucide-react"
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
  const { user: clerkUser } = useUser()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Appearance</CardTitle>
          <CardDescription>Switch between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mounted && theme === "dark" ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium text-foreground">{mounted ? (theme === "dark" ? "Dark Mode" : "Light Mode") : "Theme"}</p>
                <p className="text-xs text-muted-foreground">Toggle color scheme</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl h-11 px-5"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {mounted && theme === "dark" ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
              {mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Toggle"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{clerkUser?.fullName || "N/A"}</p>
              <p className="text-xs text-muted-foreground">Name</p>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{clerkUser?.emailAddresses?.[0]?.emailAddress || "N/A"}</p>
              <p className="text-xs text-muted-foreground">Email</p>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium capitalize text-foreground">Shopkeeper</p>
              <p className="text-xs text-muted-foreground">Role</p>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{clerkUser?.fullName ? `${clerkUser.fullName}'s Shop` : "N/A"}</p>
              <p className="text-xs text-muted-foreground">Business</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Export Data</CardTitle>
          <CardDescription>Download your data as CSV files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Products</p>
              <p className="text-xs text-muted-foreground">Export all product inventory data</p>
            </div>
            <Button
              className="bg-card border border-border text-foreground/80 hover:bg-muted rounded-xl h-11 px-5 transition-all duration-200"
              onClick={() => {
                exportAsCsv([], "products.csv")
                toast.success("Products export started")
              }}
            >
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Orders</p>
              <p className="text-xs text-muted-foreground">Export all order records</p>
            </div>
            <Button
              className="bg-card border border-border text-foreground/80 hover:bg-muted rounded-xl h-11 px-5 transition-all duration-200"
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
