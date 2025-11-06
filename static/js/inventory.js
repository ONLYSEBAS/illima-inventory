let currentSupplyId = null
const showModal = null
const closeModal = null
const fetchAPI = null

function editSupply(supplyId) {
  currentSupplyId = supplyId
  showModal("supplyModal")
}

function closeSupplyModal() {
  closeModal("supplyModal")
}

async function saveSupply() {
  const newStock = Number.parseFloat(document.getElementById("newStock").value)
  const notes = document.getElementById("notes").value

  try {
    const response = await fetchAPI(`/api/admin/supply/${currentSupplyId}`, {
      method: "PUT",
      body: JSON.stringify({
        stock: newStock,
        notes: notes,
      }),
    })

    if (response.success) {
      alert("Inventario actualizado")
      closeSupplyModal()
      location.reload()
    }
  } catch (error) {
    alert("Error al actualizar: " + error.message)
  }
}
