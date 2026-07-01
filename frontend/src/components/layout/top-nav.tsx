"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Menu, Search, User, Boxes } from "lucide-react"
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"
import { useRole } from "@/components/auth/role-guard"

export function TopNav() {
  const router = useRouter()
  const { data: session } = useSession()
  const { role } = useRole()
  const initials = session?.user?.name?.charAt(0)?.toUpperCase() || "U"

  // Different home link based on role
  const homeLink = role === "customer" ? "/" : "/dashboard"

  return (
    <header className="sticky top-0 z-40 flex items-center h-[72px] border-b bg-background px-4 lg:px-6 gap-4">
      <Sheet>
        <SheetTrigger className="lg:hidden p-2 hover:bg-muted rounded-md transition-colors">
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <Link href={homeLink} className="flex items-center gap-2 lg:hidden">
        <Boxes className="size-6 text-primary" />
        <span className="font-semibold">KhataBox</span>
      </Link>

      <div className="hidden sm:flex relative flex-1 max-w-md ml-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          placeholder={role === "customer" ? "Search products..." : "Search products, orders..."}
          className="w-full h-10 pl-10 pr-4 rounded-lg border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push("/notifications")}>
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="cursor-pointer rounded-full">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col px-2 py-1.5">
              <span className="font-medium">{session?.user?.name}</span>
              <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <User className="size-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={async () => {
              await signOut({ redirect: true, callbackUrl: "/login" })
            }} className="text-destructive">
              <LogOut className="size-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}