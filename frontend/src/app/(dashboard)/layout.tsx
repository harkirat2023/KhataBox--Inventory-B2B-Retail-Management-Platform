import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Toaster } from "sonner"
import { requireAuth } from "@/lib/auth-guard"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(["admin", "shopkeeper"])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNav />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 max-w-[1280px] w-full mx-auto">{children}</main>
      </SidebarInset>
      <BottomNav />
      <Toaster richColors closeButton position="top-right" />
    </SidebarProvider>
  )
}
