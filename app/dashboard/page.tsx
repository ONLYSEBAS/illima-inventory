"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Package, ShoppingCart, AlertCircle } from "lucide-react"

interface DashboardStats {
  totalProducts: number
  totalSales: number
  lowStockItems: number
  recentSales: Array<{
    id: number
    product_name: string
    quantity: number
    total_amount: number
    sale_date: string
  }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    lowStockItems: 0,
    recentSales: [],
  })

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard-stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    fetchStats()
  }, [])

  const chartData = [
    { name: "Lunes", ventas: 4000, productos: 2400 },
    { name: "Martes", ventas: 3000, productos: 1398 },
    { name: "Miércoles", ventas: 2000, productos: 9800 },
    { name: "Jueves", ventas: 2780, productos: 3908 },
    { name: "Viernes", ventas: 1890, productos: 4800 },
    { name: "Sábado", ventas: 2390, productos: 3800 },
  ]

  const pieData = [
    { name: "Vendidos", value: 60 },
    { name: "Stock", value: 40 },
  ]

  const COLORS = ["#c084fc", "#fbcfe8"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Panel de Control
          </h1>
          <p className="text-gray-600">Bienvenido al sistema de gestión Illima</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-purple-600">Productos</h3>
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-900">{stats.totalProducts}</p>
              <p className="text-xs text-purple-600 mt-2">Productos activos</p>
            </div>
          </Card>

          <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-pink-600">Ventas</h3>
                <ShoppingCart className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-3xl font-bold text-pink-900">{stats.totalSales}</p>
              <p className="text-xs text-pink-600 mt-2">Ventas este mes</p>
            </div>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-blue-600">Stock Bajo</h3>
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{stats.lowStockItems}</p>
              <p className="text-xs text-blue-600 mt-2">Productos con bajo stock</p>
            </div>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-amber-600">Tendencia</h3>
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-amber-900">↑ 12.5%</p>
              <p className="text-xs text-amber-600 mt-2">vs. mes anterior</p>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart */}
          <Card className="lg:col-span-2 border-purple-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-purple-900 mb-4">Ventas por Día</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#c084fc" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="productos" fill="#fbcfe8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Pie Chart */}
          <Card className="border-pink-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-pink-900 mb-4">Distribución</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card className="border-purple-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-4">Ventas Recientes</h2>
            <div className="space-y-3">
              {stats.recentSales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
                >
                  <div>
                    <p className="font-medium text-purple-900">{sale.product_name}</p>
                    <p className="text-sm text-purple-600">
                      Cantidad: {sale.quantity} | {new Date(sale.sale_date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-semibold text-purple-900">${sale.total_amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
