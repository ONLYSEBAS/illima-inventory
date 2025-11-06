// Utilidades globales
function showModal(modalId) {
  document.getElementById(modalId).style.display = "block"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

// Cerrar modal al hacer click afuera
window.onclick = (event) => {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none"
  }
}

// Función para hacer fetch con error handling
async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("API Error:", error)
    throw error
  }
}
