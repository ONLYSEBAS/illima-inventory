"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

interface CartItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface SalesCheckoutProps {
  isOpen: boolean
  cart: CartItem[]
  discount: string
  totals: {
    subtotal: number
    discount: number
    total: number
  }
  onClose: () => void
}

export default function SalesCheckout({ isOpen, cart, discount, totals, onClose }: SalesCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")

  const handleCompleteOrder = async () => {
    if (paymentMethod === "cash" && amountReceived) {
      const received = Number.parseFloat(amountReceived)
      if (received < totals.total) {
        setError("El monto recibido es menor que el total")
        return
      }
    }

    setLoading(true)
    setError("")

    try {
      // Process each product in cart
      for (const item of cart) {
        const response = await fetch("/api/sale-with-discount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: item.product_id,
            quantity: item.quantity,
            discount_id: discount || null,
            supplies_used: [],
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Error al procesar la venta")
        }
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={isOpen && success} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-green-900">Venta Completada</DialogTitle>
            <DialogDescription className="text-center text-green-700 mt-2">
              El pedido ha sido procesado exitosamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-center py-4">
            <p className="text-3xl font-bold text-green-900">${totals.total.toFixed(2)}</p>
            <p className="text-sm text-green-700">Total recaudado</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-purple-900">Completar Venta</DialogTitle>
          <DialogDescription className="text-purple-600">Revisa los detalles y completa el pago</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Order Summary */}
        <div className="space-y-3 bg-white p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900">Resumen de Orden</h3>
          <div className="space-y-2 text-sm">
            {cart.map((item) => (
              <div key={item.product_id} className="flex justify-between">
                <span className="text-purple-600">
                  {item.product_name} x{item.quantity}
                </span>
                <span className="font-medium text-purple-900">${item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-purple-200 pt-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-600">Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 mb-1">
                <span>Descuento:</span>
                <span>-${totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-purple-900 pt-1">
              <span>Total:</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label className="text-purple-900 font-semibold">Método de Pago</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-50">
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-purple-900">Efectivo</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-50">
              <input
                type="radio"
                name="payment"
                value="card"
                checked={paymentMethod === "card"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-purple-900">Tarjeta</span>
            </label>
          </div>
        </div>

        {/* Amount Received */}
        {paymentMethod === "cash" && (
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-purple-900 font-semibold">
              Monto Recibido
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              className="bg-white border-purple-200 focus:border-purple-500"
            />
            {amountReceived && (
              <div className="text-sm text-purple-600">
                Cambio: ${(Number.parseFloat(amountReceived) - totals.total).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-purple-200 text-purple-600 bg-transparent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCompleteOrder}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            {loading ? "Procesando..." : "Completar Venta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
