import NextAuth, { User } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import type { JWT } from "next-auth/jwt"
import type { Session } from "next-auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface UserWithTokens extends User {
  id: string
  email: string
  name: string
  role: string
  access_token: string
  refresh_token: string
}

interface ExtendedToken extends JWT {
  id: string
  role: string
  access_token: string
  refresh_token: string
}

interface ExtendedSession extends Session {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  access_token?: string
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const { email, password, role: selectedRole } = credentials as {
          email?: string
          password?: string
          role?: string
        }
        if (!email || !password) return null
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) return null
        const data = await res.json()
        const userRole = data.user.role
        // Validate role matches selected role (except for admin who can access everything)
        if (selectedRole && selectedRole !== "admin" && userRole !== selectedRole) {
          // For customer login, require user to have customer role
          if (selectedRole === "customer" && userRole !== "customer") {
            return null
          }
          // For shopkeeper login, require user to have shopkeeper role
          if (selectedRole === "shopkeeper" && userRole !== "shopkeeper") {
            return null
          }
        }
        return {
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name,
          role: userRole,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        } as UserWithTokens
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }): Promise<ExtendedToken> {
      if (user) {
        const u = user as UserWithTokens
        token.id = u.id
        token.role = u.role
        token.access_token = u.access_token
        token.refresh_token = u.refresh_token
      }
      return token
    },
    async session({ session, token }): Promise<ExtendedSession> {
      const t = token as ExtendedToken
      return {
        ...session,
        user: {
          ...session.user,
          id: t.id,
          email: session.user?.email || "",
          name: session.user?.name || "",
          role: t.role,
        },
        access_token: t.access_token,
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})