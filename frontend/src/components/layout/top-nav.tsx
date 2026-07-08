"use client"

import { useState } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Search, User, Boxes, Command, Settings as SettingsIcon, Building2, Pencil } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RenameStoreDialog } from "./rename-store-dialog"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useRole } from "@/components/auth/role-guard"
import { useStoreContext } from "@/lib/store-context"

export function TopNav() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()
  const { role } = useRole()
  const { activeStore } = useStoreContext()
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const initials = user?.fullName?.charAt(0)?.toUpperCase() || "U"

  const homeLink = role === "customer" ? "/" : "/dashboard"

  return (
    <header className="sticky top-0 z-40 flex items-center h-[72px] border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6 gap-3">
      <SidebarTrigger className="hidden lg:flex -ml-1" />

      {role && ["admin", "shopkeeper"].includes(role) && activeStore?.id && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-muted outline-none cursor-pointer shrink-0">
            <Avatar className="size-7 rounded-full">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(activeStore?.name || "S").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
              {activeStore?.name || "Store"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{activeStore?.name || "Store"}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.emailAddresses?.[0]?.emailAddress}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setRenameDialogOpen(true)}>
              <Pencil className="size-4 mr-2" />Rename Store
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={async () => { await signOut({ redirectUrl: "/khatabox" }) }}
              className="text-destructive focus:text-destructive">
              <LogOut className="size-4 mr-2" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Link href={homeLink} className="flex items-center gap-2.5 lg:hidden">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
          <Boxes className="size-5 text-primary" />
        </div>
        <span className="font-semibold text-lg tracking-tight">KhataBox</span>
      </Link>

      <div className="hidden sm:flex relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input placeholder={role === "customer" ? "Search products..." : "Search products, orders..."}
          className="w-full h-10 pl-10 pr-4 rounded-lg border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all" />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command className="size-3" />K
        </kbd>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative rounded-lg" onClick={() => router.push("/notifications")}>
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-muted outline-none cursor-pointer">
            <Avatar className="size-7 rounded-full">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">{user?.fullName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.emailAddresses?.[0]?.emailAddress}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <SettingsIcon className="size-4 mr-2" />Settings
            </DropdownMenuItem>
            {role && ["admin", "shopkeeper"].includes(role) && activeStore?.id && (
              <DropdownMenuItem onSelect={() => setRenameDialogOpen(true)}>
                <Pencil className="size-4 mr-2" />Rename Store
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={async () => { await signOut({ redirectUrl: "/khatabox" }) }}
              className="text-destructive focus:text-destructive">
              <LogOut className="size-4 mr-2" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activeStore?.id && (
        <RenameStoreDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          store={{ id: activeStore.id, name: activeStore.name || "Store" }}
          onRenamed={(newName) => { useStoreContext.getState().setActiveStore({ id: activeStore.id!, name: newName }) }}
        />
      )}
    </header>
  )
}
