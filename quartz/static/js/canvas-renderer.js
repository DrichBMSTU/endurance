document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll("#canvas-container")
  containers.forEach(container => {
    const canvasData = JSON.parse(container.dataset.canvas)
    // Здесь добавьте логику отрисовки (например, через SVG или HTML-элементы)
    container.innerHTML = `<pre>${JSON.stringify(canvasData, null, 2)}</pre>` // временный пример
  })
})