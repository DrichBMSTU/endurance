import { SimpleSlug, getFullSlug, simplifySlug } from "../../util/path"
import { registerEscapeHandler } from "./util"

type GraphRenderer = typeof import("./graph.lazy")

const localStorageKey = "graph-visited"
const graphModuleUrl = new URL("./static/graph.js", import.meta.url).href
let graphModulePromise: Promise<GraphRenderer> | undefined

function loadGraphRenderer(): Promise<GraphRenderer> {
  graphModulePromise ??= import(graphModuleUrl) as Promise<GraphRenderer>
  return graphModulePromise
}

function addToVisited(slug: SimpleSlug) {
  const visited = new Set<SimpleSlug>(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

document.addEventListener("nav", (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))

  const localGraphCleanups = new Map<HTMLElement, () => void>()
  const globalGraphCleanups: (() => void)[] = []
  const localGraphContainers = [
    ...document.getElementsByClassName("graph-container"),
  ] as HTMLElement[]

  async function renderLocalGraph(container: HTMLElement) {
    localGraphCleanups.get(container)?.()
    const { renderGraph } = await loadGraphRenderer()
    localGraphCleanups.set(container, await renderGraph(container, slug))
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const container = entry.target as HTMLElement
        observer.unobserve(container)
        void renderLocalGraph(container)
      }
    },
    { rootMargin: "200px 0px" },
  )
  localGraphContainers.forEach((container) => observer.observe(container))

  const handleThemeChange = () => {
    for (const container of localGraphCleanups.keys()) {
      void renderLocalGraph(container)
    }
  }
  document.addEventListener("themechange", handleThemeChange)

  const containers = [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
  const containerIcons = [...document.getElementsByClassName("global-graph-icon")] as HTMLElement[]
  let graphOpener: HTMLElement | null = null
  let globalGraphOpen = false
  let graphRequestId = 0

  async function renderGlobalGraph(event?: Event) {
    if (globalGraphOpen) return
    globalGraphOpen = true
    const requestId = ++graphRequestId
    graphOpener =
      (event?.currentTarget as HTMLElement | null) ??
      (document.activeElement as HTMLElement | null) ??
      containerIcons[0] ??
      null

    document.documentElement.classList.add("graph-open")
    containerIcons.forEach((icon) => icon.setAttribute("aria-expanded", "true"))
    for (const container of containers) {
      container.classList.add("active")
      container.setAttribute("aria-hidden", "false")
      const sidebar = container.closest(".sidebar") as HTMLElement | null
      if (sidebar) sidebar.style.zIndex = "1"
    }
    containers[0]?.querySelector<HTMLElement>(".global-graph-close")?.focus()

    const currentSlug = getFullSlug(window)
    const { renderGraph } = await loadGraphRenderer()
    if (!globalGraphOpen || requestId !== graphRequestId) return

    for (const container of containers) {
      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      if (graphContainer) {
        const cleanup = await renderGraph(graphContainer, currentSlug)
        if (!globalGraphOpen || requestId !== graphRequestId) {
          cleanup()
          return
        }
        globalGraphCleanups.push(cleanup)
      }
    }
  }

  function hideGlobalGraph(restoreFocus = true) {
    globalGraphOpen = false
    graphRequestId++
    for (const cleanup of globalGraphCleanups.splice(0)) cleanup()
    document.documentElement.classList.remove("graph-open")
    containerIcons.forEach((icon) => icon.setAttribute("aria-expanded", "false"))
    for (const container of containers) {
      container.classList.remove("active")
      container.setAttribute("aria-hidden", "true")
      const sidebar = container.closest(".sidebar") as HTMLElement | null
      if (sidebar) sidebar.style.zIndex = ""
    }

    if (restoreFocus) graphOpener?.focus()
    graphOpener = null
  }

  function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (globalGraphOpen && e.key === "Tab") {
      e.preventDefault()
      containers[0]?.querySelector<HTMLElement>(".global-graph-close")?.focus()
      return
    }

    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      globalGraphOpen ? hideGlobalGraph() : void renderGlobalGraph()
    }
  }

  containerIcons.forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })
  containers.forEach((container) => {
    registerEscapeHandler(container, hideGlobalGraph)
    const closeButton = container.querySelector<HTMLElement>(".global-graph-close")
    const closeGlobalGraph = () => hideGlobalGraph()
    closeButton?.addEventListener("click", closeGlobalGraph)
    window.addCleanup(() => closeButton?.removeEventListener("click", closeGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => {
    observer.disconnect()
    document.removeEventListener("themechange", handleThemeChange)
    document.removeEventListener("keydown", shortcutHandler)
    for (const cleanup of localGraphCleanups.values()) cleanup()
    hideGlobalGraph(false)
  })
})
