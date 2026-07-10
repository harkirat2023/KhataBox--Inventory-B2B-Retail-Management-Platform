"use client"

import { useUser } from "@/hooks/use-user"

export type { User as DbUser } from "@/hooks/use-user"

export function useDbUser() {
  const { user, loading, isLoaded, isSignedIn } = useUser()
  return { dbUser: user, loading, isLoaded, isSignedIn }
}
