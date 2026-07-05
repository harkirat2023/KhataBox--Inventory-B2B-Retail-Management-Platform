"use client"

import { useSession } from "next-auth/react"
import { Download, User, Mail, Shield, Building2, Settings } from "lucide-react"
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
      <h1 className="text-3xl font-bold text-slate-900">Settings</h1>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="size-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.name || "N/A"}</p>
              <p className="text-xs text-slate-500">Name</p>
            </div>
          </div>
          <Separator className="bg-slate-200" />
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.email || "N/A"}</p>
              <p className="text-xs text-slate-500">Email</p>
            </div>
          </div>
          <Separator className="bg-slate-200" />
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium capitalize text-slate-900">{user?.role || "N/A"}</p>
              <p className="text-xs text-slate-500">Role</p>
            </div>
          </div>
          <Separator className="bg-slate-200" />
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.name ? `${user.name}'s Shop` : "N/A"}</p>
              <p className="text-xs text-slate-500">Business</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Export Data</CardTitle>
          <CardDescription>Download your data as CSV files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Products</p>
              <p className="text-xs text-slate-500">Export all product inventory data</p>
            </div>
            <Button
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200"
              onClick={() => {
                exportAsCsv([], "products.csv")
                toast.success("Products export started")
              }}
            >
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
          </div>
          <Separator className="bg-slate-200" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Orders</p>
              <p className="text-xs text-slate-500">Export all order records</p>
            </div>
            <Button
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-11 px-5 transition-all duration-200"
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
