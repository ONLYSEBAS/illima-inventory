"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit2, Trash2, Package, AlertCircle } from "lucide-react"
import ProductManagementModal from "@/components/product-management-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: number
  name: string
  description: string
  category_name: string
  category_id: number
  active: boolean
  supply_count: number
  image_path?: string
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])

  // Fetch products on mount
  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Fetch products when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedCategory])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (selectedCategory !== "all") params.append("category_id", selectedCategory)

      const response = await fetch(`/api/admin/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleDeleteProduct = async (productId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      try {
        const response = await fetch(`/api/admin/product/${productId}`, {
          method: "DELETE",
        })
        if (response.ok) {
          setProducts(products.filter((p) => p.id !== productId))
        }
      } catch (error) {
        console.error("Error deleting product:", error)
      }
    }
  }

  const handleProductSaved = () => {
    fetchProducts()
    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-purple-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Gestión de Productos
            </h1>
          </div>
          <Button
            onClick={handleAddProduct}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-white border-purple-200 focus:border-purple-500">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-purple-600">Cargando productos...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <AlertCircle className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-purple-900 mb-2">No se encontraron productos</h3>
            <p className="text-purple-600 mb-6">
              {searchTerm || selectedCategory !== "all"
                ? "Intenta cambiar tus criterios de búsqueda"
                : "Comienza creando tu primer producto"}
            </p>
            {!searchTerm && selectedCategory === "all" && (
              <Button onClick={handleAddProduct} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Crear Producto
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-all duration-300 border-purple-200 bg-white overflow-hidden"
              >
                {/* Card Header with Category Badge */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                      {product.category_name}
                    </Badge>
                    {product.active ? (
                      <Badge className="bg-green-200 text-green-800">Activo</Badge>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-800">Inactivo</Badge>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-purple-600 mb-3 line-clamp-2 min-h-10">
                    {product.description || "Sin descripción"}
                  </p>

                  {/* Stats */}
                  <div className="bg-purple-50 rounded-lg p-3 mb-4 border border-purple-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-600">Insumos:</span>
                      <span className="font-semibold text-purple-900">{product.supply_count}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Product Management Modal */}
      <ProductManagementModal
        isOpen={isModalOpen}
        product={selectedProduct}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onProductSaved={handleProductSaved}
      />
    </div>
  )
}
