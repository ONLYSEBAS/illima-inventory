import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Navbar from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Illima - Sistema de Gestión",
  description: "Sistema integral de gestión de productos, ventas e inventario",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 min-h-screen`}>
        <Navbar />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
