document.getElementById("productForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const formData = new FormData(document.getElementById("productForm"))

  try {
    const response = await fetch("/admin/products", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()
    if (result.success) {
      alert("Producto creado exitosamente")
      document.getElementById("productForm").reset()
    }
  } catch (error) {
    alert("Error al crear el producto")
    console.error(error)
  }
})
