"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, BarChart3, Menu, LogOut, Settings } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/", label: "Productos", icon: Package },
    { href: "/sales", label: "Ventas", icon: ShoppingCart },
    { href: "/reports", label: "Reportes", icon: BarChart3 },
    { href: "/inventory", label: "Inventario", icon: Settings },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Illima
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button variant="ghost" className="text-purple-600 hover:bg-purple-100 hover:text-purple-800 gap-2">
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6 text-purple-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="flex flex-col gap-4 mt-8">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-purple-600 hover:bg-purple-100 gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logout Button */}
          <div className="hidden md:flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-purple-600 hover:bg-purple-100"
              onClick={() => (window.location.href = "/logout")}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
