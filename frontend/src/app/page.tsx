"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Boxes } from "lucide-react"
import { clientApi } from "@/lib/client-api"

export default function RootRedirect() {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      clientApi.get<{ role: string }>("/api/v1/auth/me")
        .then((dbUser) => {
          if (dbUser.role === "customer") router.replace("/customer")
          else router.replace("/dashboard")
        })
        .catch(() => router.replace("/khatabox"))
    } else {
      router.replace("/khatabox")
    }
  }, [isLoaded, isSignedIn, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-14">
          <div className="absolute inset-0 bg-blue-500 rounded-xl animate-pulse opacity-30" />
          <div className="relative size-full bg-card rounded-xl flex items-center justify-center shadow-sm border">
            <Boxes className="size-7 text-blue-600" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
