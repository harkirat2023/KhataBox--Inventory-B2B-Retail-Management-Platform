"use client"

import { useState } from "react"
import Link from "next/link"
import { Boxes, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const navLinks = [
  { href: "/khatabox#features", label: "Features" },
  { href: "/khatabox#how-it-works", label: "How It Works" },
  { href: "/khatabox#roles", label: "Get Started" },
]

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="bg-primary rounded-xl p-1.5 shadow-sm shadow-blue-200">
            <Boxes className="size-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">KhataBox</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200">{l.label}</a>
          ))}
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button className="p-2 -mr-2 rounded-lg hover:bg-accent transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="size-5 text-muted-foreground" /> : <Menu className="size-5 text-muted-foreground" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 space-y-1 border-t border-border pt-2 bg-card">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">{l.label}</a>
          ))}
        </div>
      )}
    </nav>
  )
}
