"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Plus, Trash2 } from "lucide-react"

interface Product {
  id: number
  name: string
  description: string
  category_id: number
  category_name?: string
  image_path?: string
  active: boolean
}

interface Category {
  id: number
  name: string
}

interface Supply {
  id: number
  name: string
  quantity: number
  optional: boolean
  unit: string
  stock: number
}

interface ProductManagementModalProps {
  isOpen: boolean
  product: Product | null
  categories: Category[]
  onClose: () => void
  onProductSaved: () => void
}

export default function ProductManagementModal({
  isOpen,
  product,
  categories,
  onClose,
  onProductSaved,
}: ProductManagementModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [productSupplies, setProductSupplies] = useState<Supply[]>([])
  const [selectedSupply, setSelectedSupply] = useState<string>("")
  const [supplyQuantity, setSupplyQuantity] = useState("1")
  const [isOptional, setIsOptional] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    description: "",
    image_path: "",
  })

  useEffect(() => {
    if (isOpen) {
      fetchSupplies()
      if (product) {
        setFormData({
          name: product.name,
          category_id: product.category_id.toString(),
          description: product.description,
          image_path: product.image_path || "",
        })
        fetchProductSupplies(product.id)
      } else {
        resetForm()
      }
    }
  }, [isOpen, product])

  const fetchSupplies = async () => {
    try {
      const response = await fetch("/api/supplies")
      if (response.ok) {
        const data = await response.json()
        setSupplies(data)
      }
    } catch (error) {
      console.error("Error fetching supplies:", error)
    }
  }

  const fetchProductSupplies = async (productId: number) => {
    try {
      const response = await fetch(`/api/admin/product/${productId}/supplies`)
      if (response.ok) {
        const data = await response.json()
        setProductSupplies(data)
      }
    } catch (error) {
      console.error("Error fetching product supplies:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category_id: "",
      description: "",
      image_path: "",
    })
    setProductSupplies([])
    setSelectedSupply("")
    setSupplyQuantity("1")
    setIsOptional(false)
    setError("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddSupply = () => {
    if (!selectedSupply || !supplyQuantity) {
      setError("Selecciona un insumo y una cantidad")
      return
    }

    const supply = supplies.find((s) => s.id.toString() === selectedSupply)
    if (!supply) return

    // Check if supply already exists
    const exists = productSupplies.find((ps) => ps.id === supply.id)
    if (exists) {
      setError("Este insumo ya está agregado al producto")
      return
    }

    setProductSupplies((prev) => [
      ...prev,
      {
        ...supply,
        quantity: Number.parseFloat(supplyQuantity),
        optional: isOptional,
      },
    ])

    setSelectedSupply("")
    setSupplyQuantity("1")
    setIsOptional(false)
    setError("")
  }

  const handleRemoveSupply = (supplyId: number) => {
    setProductSupplies((prev) => prev.filter((ps) => ps.id !== supplyId))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.category_id) {
      setError("El nombre y la categoría son requeridos")
      return
    }

    setLoading(true)
    setError("")

    try {
      let productId = product?.id

      // Create or update product
      if (product) {
        const response = await fetch(`/api/admin/product/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            category_id: Number.parseInt(formData.category_id),
          }),
        })

        if (!response.ok) {
          throw new Error("Error al actualizar el producto")
        }
      } else {
        const response = await fetch("/api/admin/product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            category_id: Number.parseInt(formData.category_id),
          }),
        })

        if (!response.ok) {
          throw new Error("Error al crear el producto")
        }

        const data = await response.json()
        productId = data.id
      }

      // Update product supplies if product exists
      if (productId) {
        const suppliesData = productSupplies.map((ps) => ({
          supply_id: ps.id,
          quantity: ps.quantity,
          optional: ps.optional,
        }))

        const response = await fetch(`/api/admin/product/${productId}/supplies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplies: suppliesData }),
        })

        if (!response.ok) {
          throw new Error("Error al actualizar los insumos")
        }
      }

      onProductSaved()
      resetForm()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-900">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription className="text-purple-600">
            {product
              ? "Actualiza los detalles del producto y sus insumos"
              : "Crea un nuevo producto con sus insumos asociados"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border-purple-200">
            <TabsTrigger value="details" className="data-[state=active]:bg-purple-100">
              Detalles
            </TabsTrigger>
            <TabsTrigger value="supplies" className="data-[state=active]:bg-purple-100">
              Insumos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-purple-900 font-semibold">
                Nombre del Producto
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Café Latte Clásico"
                className="bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id" className="text-purple-900 font-semibold">
                Categoría
              </Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger className="bg-white border-purple-200 focus:border-purple-500">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-purple-900 font-semibold">
                Descripción
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe el producto..."
                className="bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500 min-h-24"
              />
            </div>
          </TabsContent>

          <TabsContent value="supplies" className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 bg-white p-4 rounded-lg border border-purple-200">
              <div className="space-y-2">
                <Label htmlFor="supply" className="text-purple-900 font-semibold">
                  Selecciona un Insumo
                </Label>
                <Select value={selectedSupply} onValueChange={setSelectedSupply}>
                  <SelectTrigger className="bg-white border-purple-200 focus:border-purple-500">
                    <SelectValue placeholder="Busca un insumo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((supply) => (
                      <SelectItem key={supply.id} value={supply.id.toString()}>
                        {supply.name} (Disp: {supply.stock} {supply.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-purple-900 font-semibold">
                    Cantidad
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={supplyQuantity}
                    onChange={(e) => setSupplyQuantity(e.target.value)}
                    placeholder="1"
                    className="bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOptional}
                      onChange={(e) => setIsOptional(e.target.checked)}
                      className="w-4 h-4 rounded border-purple-200 text-purple-600"
                    />
                    <span className="text-sm text-purple-900 font-medium">Opcional</span>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleAddSupply}
                className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Insumo
              </Button>
            </div>

            {/* Current Supplies List */}
            {productSupplies.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-900">Insumos del Producto</h4>
                <div className="space-y-2">
                  {productSupplies.map((supply) => (
                    <div
                      key={supply.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-purple-900">{supply.name}</p>
                        <p className="text-sm text-purple-600">
                          {supply.quantity} {supply.unit}
                          {supply.optional && (
                            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                              Opcional
                            </Badge>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSupply(supply.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-purple-200 text-purple-600 hover:bg-purple-50 bg-transparent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {loading ? "Guardando..." : "Guardar Producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
