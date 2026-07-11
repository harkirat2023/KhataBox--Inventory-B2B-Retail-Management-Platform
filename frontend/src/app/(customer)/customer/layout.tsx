import { requireAuth } from "@/lib/auth-guard"

export const dynamic = "force-dynamic"

export default async function CustomerPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth(["customer"])

  return <>{children}</>
}
