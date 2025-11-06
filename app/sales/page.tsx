"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Search, Minus, Trash2, Tag } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SalesCheckout from "@/components/sales-checkout"

interface Product {
  id: number
  name: string
  category_name: string
  price?: number
}

interface CartItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Discount {
  id: number
  name: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: number
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedDiscount, setSelectedDiscount] = useState<string>("none")
  const [showCheckout, setShowCheckout] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchDiscounts()
    fetchCategories()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedCategory])

  const fetchProducts = async () => {
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
    }
  }

  const fetchDiscounts = async () => {
    try {
      const response = await fetch("/api/discounts")
      if (response.ok) {
        const data = await response.json()
        setDiscounts(data)
      }
    } catch (error) {
      console.error("Error fetching discounts:", error)
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

  const handleAddToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product_id === product.id)
    const unitPrice = product.price || 0

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * unitPrice,
              }
            : item,
        ),
      )
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: unitPrice,
          subtotal: unitPrice,
        },
      ])
    }
  }

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId)
    } else {
      setCart(
        cart.map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity,
                subtotal: quantity * item.unit_price,
              }
            : item,
        ),
      )
    }
  }

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product_id !== productId))
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)

    let discount = 0
    if (selectedDiscount !== "none") {
      const discountObj = discounts.find((d) => d.id.toString() === selectedDiscount)
      if (discountObj) {
        if (discountObj.discount_type === "percentage") {
          discount = (subtotal * discountObj.discount_value) / 100
        } else {
          discount = discountObj.discount_value * cart.reduce((sum, item) => sum + item.quantity, 0)
        }
      }
    }

    const total = Math.max(0, subtotal - discount)
    return { subtotal, discount, total }
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-purple-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Sistema de Ventas
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            {/* Filters */}
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
                <SelectTrigger className="w-full sm:w-48 bg-white border-purple-200">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="hover:shadow-lg transition-all duration-300 border-purple-200 bg-white overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3">
                    <Badge className="bg-purple-200 text-purple-800">{product.category_name}</Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-purple-900 mb-2">{product.name}</h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-purple-600">${product.price?.toFixed(2) || "0.00"}</span>
                    </div>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart & Checkout Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Carrito ({cart.length})
                </h2>
              </div>

              <div className="p-4 space-y-4">
                {/* Cart Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-center text-purple-600 py-8">Carrito vacío</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product_id} className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-purple-900">{item.product_name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.product_id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              className="border-purple-200"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.product_id, Number.parseInt(e.target.value))}
                              className="w-12 text-center border-purple-200"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              className="border-purple-200"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="font-semibold text-purple-900">${item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Discount Section */}
                {discounts.length > 0 && (
                  <div className="space-y-2 border-t border-purple-200 pt-4">
                    <label className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Aplicar Descuento
                    </label>
                    <Select value={selectedDiscount} onValueChange={setSelectedDiscount}>
                      <SelectTrigger className="bg-white border-purple-200">
                        <SelectValue placeholder="Sin descuento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin descuento</SelectItem>
                        {discounts.map((discount) => (
                          <SelectItem key={discount.id} value={discount.id.toString()}>
                            {discount.name} (
                            {discount.discount_type === "percentage"
                              ? `${discount.discount_value}%`
                              : `$${discount.discount_value}`}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-2 border-t border-purple-200 pt-4">
                  <div className="flex justify-between text-sm text-purple-600">
                    <span>Subtotal:</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento:</span>
                      <span>-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-purple-900 bg-purple-100 -mx-4 -mb-4 px-4 py-3">
                    <span>Total:</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Completar Venta
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <SalesCheckout
          isOpen={showCheckout}
          cart={cart}
          discount={selectedDiscount}
          totals={totals}
          onClose={() => {
            setShowCheckout(false)
            setCart([])
            setSelectedDiscount("none")
          }}
        />
      )}
    </div>
  )
}
