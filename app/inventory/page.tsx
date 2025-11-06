"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Download, RefreshCw } from "lucide-react"

interface InventoryItem {
  id: number
  name: string
  stock: number
  min_stock: number
  unit: string
  category: string
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const data = await response.json()
        setInventory(data)
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch("/admin/export-csv")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `inventario_${new Date().toISOString().split("T")[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting:", error)
    }
  }

  const lowStockItems = inventory.filter((item) => item.stock <= item.min_stock)
  const filteredItems = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Gestión de Inventario
            </h1>
            <p className="text-gray-600">Monitorea y controla tu inventario</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchInventory} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
            <Button onClick={handleExportCSV} className="gap-2 bg-pink-500 hover:bg-pink-600 text-white">
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">{lowStockItems.length} producto(s) con stock bajo</p>
                <p className="text-sm text-red-700">Considera reabastecer estos artículos pronto</p>
              </div>
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Buscar por nombre o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border-purple-200 focus:border-purple-500 max-w-md"
          />
        </div>

        {/* Inventory Table */}
        <Card className="border-purple-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-900">Producto</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-900">Categoría</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-purple-900">Stock Actual</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-purple-900">Stock Mínimo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-900">Unidad</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-purple-900">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-purple-600">
                      Cargando inventario...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-purple-600">
                      No hay productos en el inventario
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-purple-900">{item.name}</td>
                      <td className="px-6 py-4 text-purple-700">{item.category}</td>
                      <td className="px-6 py-4 text-right font-semibold text-purple-900">{item.stock}</td>
                      <td className="px-6 py-4 text-right text-purple-700">{item.min_stock}</td>
                      <td className="px-6 py-4 text-purple-700">{item.unit}</td>
                      <td className="px-6 py-4 text-center">
                        {item.stock <= item.min_stock ? (
                          <Badge className="bg-red-100 text-red-800">Bajo</Badge>
                        ) : item.stock <= item.min_stock * 1.5 ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Medio</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Bueno</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
