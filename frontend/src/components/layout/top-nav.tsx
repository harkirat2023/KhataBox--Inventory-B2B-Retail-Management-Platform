"use client"

import { useState } from "react"
import { useUser } from "@/hooks/use-user"
import { clearAuthToken } from "@/lib/client-api"
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
  const { role } = useRole()
  const { activeStore } = useStoreContext()
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U"

  const homeLink = role === "customer" ? "/" : "/dashboard"

  return (
    <header className="sticky top-0 z-40 flex items-center h-[64px] border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl px-4 lg:px-6 gap-3">
      <SidebarTrigger className="hidden lg:flex -ml-1 text-zinc-400 hover:text-foreground" />

      {role && ["admin", "shopkeeper"].includes(role) && activeStore?.id && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-[4px] hover:bg-zinc-800 outline-none cursor-pointer shrink-0">
            <Avatar className="size-7 rounded-[4px]">
              <AvatarFallback className="text-xs bg-amber-brand/10 text-amber-brand">
                {(activeStore?.name || "S").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate text-foreground">
              {activeStore?.name || "Store"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 border-zinc-700/60 bg-zinc-900">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{activeStore?.name || "Store"}</span>
                <span className="text-xs text-zinc-400 font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onSelect={() => setRenameDialogOpen(true)} className="text-zinc-300 focus:text-foreground focus:bg-zinc-800">
              <Pencil className="size-4 mr-2" />Rename Store
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onSelect={() => { clearAuthToken(); router.push("/khatabox") }}
              className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="size-4 mr-2" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Link href={homeLink} className="flex items-center gap-2.5 lg:hidden">
        <div className="flex items-center justify-center size-8 rounded-[4px] bg-amber-brand/10">
          <Boxes className="size-5 text-amber-brand" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-foreground">KhataBox</span>
      </Link>

      <div className="hidden sm:flex relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input placeholder={role === "customer" ? "Search products..." : "Search products, orders..."}
          className="w-full h-10 pl-10 pr-4 rounded-[4px] border border-zinc-800/80 bg-zinc-900/60 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-brand/20 focus:border-amber-brand/60 focus:bg-zinc-900 transition-all" />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 rounded-[3px] border border-zinc-800 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 font-mono">
          <Command className="size-3" />K
        </kbd>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative rounded-[4px]" onClick={() => router.push("/notifications")}>
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-zinc-900" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-[4px] hover:bg-zinc-800 outline-none cursor-pointer">
            <Avatar className="size-7 rounded-[4px]">
              <AvatarFallback className="text-xs bg-amber-brand/10 text-amber-brand">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate text-foreground">{user?.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-zinc-700/60 bg-zinc-900">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{user?.name}</span>
                <span className="text-xs text-zinc-400 font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onSelect={() => router.push("/settings")} className="text-zinc-300 focus:text-foreground focus:bg-zinc-800">
              <SettingsIcon className="size-4 mr-2" />Settings
            </DropdownMenuItem>
            {role && ["admin", "shopkeeper"].includes(role) && activeStore?.id && (
              <DropdownMenuItem onSelect={() => setRenameDialogOpen(true)} className="text-zinc-300 focus:text-foreground focus:bg-zinc-800">
                <Pencil className="size-4 mr-2" />Rename Store
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onSelect={() => { clearAuthToken(); router.push("/khatabox") }}
              className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
