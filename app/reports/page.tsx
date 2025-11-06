"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Calendar } from "lucide-react"

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [salesData, setSalesData] = useState<any[]>([])
  const [totals, setTotals] = useState({ total_sales: 0, total_discounts: 0, sales_count: 0 })

  const fetchReport = async () => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("start_date", startDate)
      if (endDate) params.append("end_date", endDate)

      const response = await fetch(`/api/admin/sales-report?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSalesData(data.sales)
        setTotals(data.totals)
      }
    } catch (error) {
      console.error("Error fetching report:", error)
    }
  }

  const handleExport = () => {
    const csv = [
      ["Fecha", "Producto", "Cantidad", "Total", "Descuento", "Vendedor"],
      ...salesData.map((s) => [
        new Date(s.sale_date).toLocaleDateString(),
        s.product_name,
        s.quantity,
        s.total_amount,
        s.discount_amount,
        s.seller,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte_ventas_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Reportes de Ventas
          </h1>
          <p className="text-gray-600">Analiza el desempeño de tus ventas</p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-8 border-purple-200 bg-white">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-purple-900 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border-purple-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-purple-900 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Fecha Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border-purple-200"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchReport} className="bg-purple-500 hover:bg-purple-600 text-white">
                Buscar
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-purple-200 text-purple-600 gap-2 bg-transparent"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <p className="text-sm text-purple-600 font-medium">Total Ventas</p>
            <p className="text-3xl font-bold text-purple-900">${totals.total_sales.toFixed(2)}</p>
          </Card>
          <Card className="p-6 border-pink-200 bg-gradient-to-br from-pink-50 to-white">
            <p className="text-sm text-pink-600 font-medium">Total Descuentos</p>
            <p className="text-3xl font-bold text-pink-900">${totals.total_discounts.toFixed(2)}</p>
          </Card>
          <Card className="p-6 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-blue-600 font-medium">Número de Ventas</p>
            <p className="text-3xl font-bold text-blue-900">{totals.sales_count}</p>
          </Card>
        </div>

        {/* Sales Table */}
        {salesData.length > 0 && (
          <Card className="border-purple-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-purple-900">Fecha</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-purple-900">Producto</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-purple-900">Cantidad</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-purple-900">Total</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-purple-900">Descuento</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-purple-900">Vendedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-200">
                  {salesData.map((sale, idx) => (
                    <tr key={idx} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 text-purple-900">{new Date(sale.sale_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-purple-900">{sale.product_name}</td>
                      <td className="px-6 py-4 text-right text-purple-700">{sale.quantity}</td>
                      <td className="px-6 py-4 text-right font-semibold text-purple-900">
                        ${sale.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-green-600">-${sale.discount_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-purple-700">{sale.seller}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
