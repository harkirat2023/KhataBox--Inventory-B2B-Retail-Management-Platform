"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RoleGuard } from "@/components/auth/role-guard"
import { Skeleton } from "@/components/ui/skeleton"
import { clientApi } from "@/lib/client-api"
import { toast } from "sonner"

interface User {
  id: number
  email: string
  name: string
  role: string
  store_name: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set("role", roleFilter)
      if (search) params.set("search", search)
      const data = await clientApi.get<User[]>(`/api/v1/auth/users?${params}`)
      setUsers(data)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [roleFilter, search])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await clientApi.patch(`/api/v1/auth/users/${userId}/role?new_role=${newRole}`, {})
      toast.success("Role updated")
      loadUsers()
    } catch {
      toast.error("Failed to update role")
    }
  }

  const handleToggleActive = async (userId: number) => {
    try {
      await clientApi.patch(`/api/v1/auth/users/${userId}/toggle-active`, {})
      toast.success("User status toggled")
      loadUsers()
    } catch {
      toast.error("Failed to toggle user status")
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10 rounded-xl bg-muted border-0 h-11"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setTimeout(loadUsers, 300)
              }}
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "")}>
            <SelectTrigger className="w-40 rounded-xl border-border h-11">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <Shield className="size-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-1">No users found</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">No users match your search criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) => v && handleRoleChange(user.id, v)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs rounded-lg border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.store_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      className={user.is_active ? "bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-5 transition-all duration-200" : "bg-card border border-border text-foreground/80 hover:bg-muted rounded-xl h-11 px-5 transition-all duration-200"}
                      size="sm"
                      onClick={() => handleToggleActive(user.id)}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            </TableBody>
          </Table>
        </div>
      </div>
    </RoleGuard>
  )
}
