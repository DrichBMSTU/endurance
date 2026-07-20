const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const slug = entry.target.id
    const tocEntryElements = document.querySelectorAll(`a[data-for="${slug}"]`)
    const windowHeight = entry.rootBounds?.height
    if (windowHeight && tocEntryElements.length > 0) {
      if (entry.boundingClientRect.y < windowHeight) {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.add("in-view"))
      } else {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.remove("in-view"))
      }
    }
  }
})

function toggleToc(this: HTMLElement) {
  this.classList.toggle("collapsed")
  const expanded = this.getAttribute("aria-expanded") !== "true"
  this.setAttribute("aria-expanded", expanded.toString())
  const label = expanded ? this.dataset.collapseLabel : this.dataset.expandLabel
  if (label) this.setAttribute("aria-label", label)
  const contentId = this.getAttribute("aria-controls")
  const content = contentId ? document.getElementById(contentId) : null
  if (!content) return
  content.classList.toggle("collapsed")
  content.setAttribute("aria-hidden", (!expanded).toString())
  content.toggleAttribute("inert", !expanded)
}

function setupToc() {
  for (const toc of document.getElementsByClassName("toc")) {
    const button = toc.querySelector(".toc-header")
    const contentId = button?.getAttribute("aria-controls")
    const content = contentId ? document.getElementById(contentId) : null
    if (!button || !content) return
    button.addEventListener("click", toggleToc)
    window.addCleanup(() => button.removeEventListener("click", toggleToc))
  }
}

document.addEventListener("nav", () => {
  setupToc()

  // update toc entry highlighting
  observer.disconnect()
  const headers = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
  headers.forEach((header) => observer.observe(header))
})
