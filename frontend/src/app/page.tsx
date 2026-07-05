"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Boxes } from "lucide-react"

export default function RootRedirect() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return
    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as any).role
      if (userRole === "customer") router.replace("/customer")
      else if (["admin", "shopkeeper"].includes(userRole)) router.replace("/dashboard")
    } else {
      router.replace("/khatabox")
    }
  }, [status, session, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-14">
          <div className="absolute inset-0 bg-blue-500 rounded-xl animate-pulse opacity-30" />
          <div className="relative size-full bg-white rounded-xl flex items-center justify-center shadow-sm border">
            <Boxes className="size-7 text-blue-600" />
          </div>
        </div>
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  )
}
