let currentProduct = null

// Declare fetchAPI, showModal, and closeModal functions
function fetchAPI(url, options = {}) {
  return fetch(url, options).then((response) => response.json())
}

function showModal(modalId) {
  document.getElementById(modalId).style.display = "block"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

async function selectProduct(productId) {
  try {
    const response = await fetchAPI(`/api/product/${productId}`)
    currentProduct = response.product

    document.getElementById("productTitle").textContent = response.product.name

    let suppliesList = '<h3>Insumos necesarios:</h3><div class="supplies-list">'
    response.supplies.forEach((supply) => {
      suppliesList += `
                <div class="supply-item">
                    <span>${supply.name}</span>
                    <span class="supply-qty">${supply.quantity} ${supply.optional ? "(opcional)" : ""}</span>
                </div>
            `
    })
    suppliesList += "</div>"

    document.getElementById("suppliesList").innerHTML = suppliesList
    showModal("productModal")
  } catch (error) {
    alert("Error al cargar el producto")
  }
}

function closeProductModal() {
  closeModal("productModal")
}

async function confirmSale() {
  if (!currentProduct) return

  const quantity = Number.parseInt(document.getElementById("quantity").value)

  try {
    const response = await fetchAPI("/api/sale", {
      method: "POST",
      body: JSON.stringify({
        product_id: currentProduct.id,
        quantity: quantity,
        supplies_used: [],
      }),
    })

    if (response.success) {
      alert("Venta registrada exitosamente")
      closeProductModal()
      location.reload()
    }
  } catch (error) {
    alert("Error al registrar la venta: " + error.message)
  }
}
