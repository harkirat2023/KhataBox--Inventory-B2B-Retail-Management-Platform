import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Toaster } from "sonner"
import { requireAuth } from "@/lib/auth-guard"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(["admin", "shopkeeper"])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 max-w-[1280px] w-full mx-auto">{children}</main>
      </div>
      <BottomNav />
      <Toaster richColors closeButton />
    </div>
  )
}
