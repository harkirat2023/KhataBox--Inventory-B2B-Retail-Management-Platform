"use client"

import { useEffect, useState, useCallback } from "react"
import { Search } from "lucide-react"
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

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set("role", roleFilter)
      if (search) params.set("search", search)
      const data = await clientApi.get<User[]>(`/api/v1/auth/users?${params}`)
      setUsers(data)
    } catch {
      toast.error("Failed to load users")
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
        <h1 className="text-2xl font-semibold">User Management</h1>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setTimeout(loadUsers, 300)
              }}
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "")}>
            <SelectTrigger className="w-40">
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

        <div className="rounded-lg border">
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
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) => v && handleRoleChange(user.id, v)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
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
                      variant={user.is_active ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleToggleActive(user.id)}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </RoleGuard>
  )
}
