import { FileTrieNode } from "../../util/fileTrie"
import { FullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { ContentMetadata } from "../../plugins/emitters/contentIndex"

type MaybeHTMLElement = HTMLElement | undefined
type ExplorerNode = FileTrieNode<ContentMetadata>

interface ParsedOptions {
  folderClickBehavior: "collapse" | "link"
  folderDefaultState: "collapsed" | "open"
  useSavedState: boolean
  sortFn: (a: ExplorerNode, b: ExplorerNode) => number
  filterFn: (node: ExplorerNode) => boolean
  mapFn: (node: ExplorerNode) => void
  order: ("sort" | "filter" | "map")[]
  expandFolderLabel: string
  collapseFolderLabel: string
}

type FolderState = {
  path: string
  collapsed: boolean
}

let currentExplorerState: Array<FolderState>

function setExplorerExpanded(explorer: HTMLElement, expanded: boolean) {
  explorer.classList.toggle("collapsed", !expanded)
  const label = expanded ? explorer.dataset.closeLabel : explorer.dataset.openLabel
  for (const toggle of explorer.querySelectorAll<HTMLButtonElement>(".explorer-toggle")) {
    toggle.setAttribute("aria-expanded", expanded.toString())
    if (label) toggle.setAttribute("aria-label", label)
  }

  const mobileToggle = explorer.querySelector<HTMLButtonElement>(".mobile-explorer")
  if (mobileToggle?.checkVisibility()) {
    document.documentElement.classList.toggle("explorer-open", expanded)
  }
}

function toggleExplorer(this: HTMLButtonElement) {
  const nearestExplorer = this.closest(".explorer") as HTMLElement
  if (!nearestExplorer) return
  setExplorerExpanded(nearestExplorer, nearestExplorer.classList.contains("collapsed"))
}

function toggleFolder(evt: MouseEvent) {
  evt.stopPropagation()
  const toggle = evt.currentTarget as HTMLButtonElement | null
  const folderContainer = toggle?.closest(".folder-container") as MaybeHTMLElement
  if (!folderContainer) return
  const childFolderContainer = folderContainer.nextElementSibling as MaybeHTMLElement
  if (!childFolderContainer) return

  childFolderContainer.classList.toggle("open")

  // Collapse folder container
  const isCollapsed = !childFolderContainer.classList.contains("open")
  setFolderState(childFolderContainer, isCollapsed)
  updateFolderToggles(folderContainer, !isCollapsed)

  const currentFolderState = currentExplorerState.find(
    (item) => item.path === folderContainer.dataset.folderpath,
  )
  if (currentFolderState) {
    currentFolderState.collapsed = isCollapsed
  } else {
    currentExplorerState.push({
      path: folderContainer.dataset.folderpath as FullSlug,
      collapsed: isCollapsed,
    })
  }

  const stringifiedFileTree = JSON.stringify(currentExplorerState)
  localStorage.setItem("fileTree", stringifiedFileTree)
}

function createFileNode(currentSlug: FullSlug, node: ExplorerNode): HTMLLIElement {
  const template = document.getElementById("template-file") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const a = li.querySelector("a") as HTMLAnchorElement
  a.href = resolveRelative(currentSlug, node.slug)
  a.dataset.for = node.slug
  a.textContent = node.displayName

  if (currentSlug === node.slug) {
    a.classList.add("active")
    a.setAttribute("aria-current", "page")
  }

  return li
}

function createFolderNode(
  currentSlug: FullSlug,
  node: ExplorerNode,
  opts: ParsedOptions,
): HTMLLIElement {
  const template = document.getElementById("template-folder") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const folderContainer = li.querySelector(".folder-container") as HTMLElement
  const titleContainer = folderContainer.querySelector("div") as HTMLElement
  const folderOuter = li.querySelector(".folder-outer") as HTMLElement
  const folderToggle = li.querySelector(".folder-toggle") as HTMLButtonElement
  const ul = folderOuter.querySelector("ul") as HTMLUListElement

  const folderPath = node.slug
  folderContainer.dataset.folderpath = folderPath

  if (opts.folderClickBehavior === "link") {
    // Replace button with link for link behavior
    const button = titleContainer.querySelector(".folder-button") as HTMLElement
    const a = document.createElement("a")
    a.href = resolveRelative(currentSlug, folderPath)
    a.dataset.for = folderPath
    a.className = "folder-title"
    a.textContent = node.displayName
    button.replaceWith(a)
  } else {
    const span = titleContainer.querySelector(".folder-title") as HTMLElement
    span.textContent = node.displayName
  }

  // if the saved state is collapsed or the default state is collapsed
  const isCollapsed =
    currentExplorerState.find((item) => item.path === folderPath)?.collapsed ??
    opts.folderDefaultState === "collapsed"

  // if this folder is a prefix of the current path we
  // want to open it anyways
  const simpleFolderPath = simplifySlug(folderPath)
  const folderIsPrefixOfCurrentSlug =
    simpleFolderPath === currentSlug.slice(0, simpleFolderPath.length)

  const isExpanded = !isCollapsed || folderIsPrefixOfCurrentSlug
  if (isExpanded) {
    folderOuter.classList.add("open")
  }
  folderToggle.dataset.expandLabel = opts.expandFolderLabel
  folderToggle.dataset.collapseLabel = opts.collapseFolderLabel
  folderToggle.dataset.folderName = node.displayName
  updateFolderToggles(folderContainer, isExpanded)

  for (const child of node.children) {
    const childNode = child.isFolder
      ? createFolderNode(currentSlug, child, opts)
      : createFileNode(currentSlug, child)
    ul.appendChild(childNode)
  }

  return li
}

async function setupExplorer(currentSlug: FullSlug) {
  const allExplorers = document.querySelectorAll("div.explorer") as NodeListOf<HTMLElement>

  for (const explorer of allExplorers) {
    const dataFns = JSON.parse(explorer.dataset.dataFns || "{}")
    const opts: ParsedOptions = {
      folderClickBehavior: (explorer.dataset.behavior || "collapse") as "collapse" | "link",
      folderDefaultState: (explorer.dataset.collapsed || "collapsed") as "collapsed" | "open",
      useSavedState: explorer.dataset.savestate === "true",
      order: dataFns.order || ["filter", "map", "sort"],
      sortFn: new Function("return " + (dataFns.sortFn || "undefined"))(),
      filterFn: new Function("return " + (dataFns.filterFn || "undefined"))(),
      mapFn: new Function("return " + (dataFns.mapFn || "undefined"))(),
      expandFolderLabel: explorer.dataset.expandFolderLabel || "Expand section",
      collapseFolderLabel: explorer.dataset.collapseFolderLabel || "Collapse section",
    }

    // Get folder state from local storage
    const storageTree = localStorage.getItem("fileTree")
    const serializedExplorerState = storageTree && opts.useSavedState ? JSON.parse(storageTree) : []
    const oldIndex = new Map<string, boolean>(
      serializedExplorerState.map((entry: FolderState) => [entry.path, entry.collapsed]),
    )

    const data = await fetchDataMetadata()
    const entries = [...Object.entries(data)] as [FullSlug, ContentMetadata][]
    const trie = FileTrieNode.fromEntries(entries)

    // Apply functions in order
    for (const fn of opts.order) {
      switch (fn) {
        case "filter":
          if (opts.filterFn) trie.filter(opts.filterFn)
          break
        case "map":
          if (opts.mapFn) trie.map(opts.mapFn)
          break
        case "sort":
          if (opts.sortFn) trie.sort(opts.sortFn)
          break
      }
    }

    // Get folder paths for state management
    const folderPaths = trie.getFolderPaths()
    currentExplorerState = folderPaths.map((path) => {
      const previousState = oldIndex.get(path)
      return {
        path,
        collapsed:
          previousState === undefined ? opts.folderDefaultState === "collapsed" : previousState,
      }
    })

    const explorerUl = explorer.querySelector(".explorer-ul")
    if (!explorerUl) continue

    // Create and insert new content
    const fragment = document.createDocumentFragment()
    for (const child of trie.children) {
      const node = child.isFolder
        ? createFolderNode(currentSlug, child, opts)
        : createFileNode(currentSlug, child)

      fragment.appendChild(node)
    }
    explorerUl.insertBefore(fragment, explorerUl.firstChild)

    // restore explorer scrollTop position if it exists
    const scrollTop = sessionStorage.getItem("explorerScrollTop")
    if (scrollTop) {
      explorerUl.scrollTop = parseInt(scrollTop)
    } else {
      // try to scroll to the active element if it exists
      const activeElement = explorerUl.querySelector(".active")
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
    }

    // Set up event handlers
    const explorerButtons = explorer.getElementsByClassName(
      "explorer-toggle",
    ) as HTMLCollectionOf<HTMLElement>
    for (const button of explorerButtons) {
      button.addEventListener("click", toggleExplorer)
      window.addCleanup(() => button.removeEventListener("click", toggleExplorer))
    }

    // Set up folder click handlers
    if (opts.folderClickBehavior === "collapse") {
      const folderButtons = explorer.getElementsByClassName(
        "folder-button",
      ) as HTMLCollectionOf<HTMLElement>
      for (const button of folderButtons) {
        button.addEventListener("click", toggleFolder)
        window.addCleanup(() => button.removeEventListener("click", toggleFolder))
      }
    }

    const folderToggles = explorer.getElementsByClassName(
      "folder-toggle",
    ) as HTMLCollectionOf<HTMLElement>
    for (const toggle of folderToggles) {
      toggle.addEventListener("click", toggleFolder)
      window.addCleanup(() => toggle.removeEventListener("click", toggleFolder))
    }

    const closeExplorerOnEscape = (event: KeyboardEvent) => {
      if (!event.key.startsWith("Esc") || explorer.classList.contains("collapsed")) return
      const mobileToggle = explorer.querySelector<HTMLButtonElement>(".mobile-explorer")
      if (!mobileToggle?.checkVisibility()) return
      event.preventDefault()
      setExplorerExpanded(explorer, false)
      mobileToggle.focus()
    }
    document.addEventListener("keydown", closeExplorerOnEscape)
    window.addCleanup(() => document.removeEventListener("keydown", closeExplorerOnEscape))
  }
}

document.addEventListener("prenav", async () => {
  // save explorer scrollTop position
  const explorer = document.querySelector(".explorer-ul")
  if (!explorer) return
  sessionStorage.setItem("explorerScrollTop", explorer.scrollTop.toString())
})

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const currentSlug = e.detail.url
  await setupExplorer(currentSlug)

  // if mobile hamburger is visible, collapse by default
  for (const explorer of document.getElementsByClassName("explorer")) {
    const mobileExplorer = explorer.querySelector(".mobile-explorer")
    if (!mobileExplorer) return

    if (mobileExplorer.checkVisibility()) {
      setExplorerExpanded(explorer as HTMLElement, false)
    } else {
      setExplorerExpanded(explorer as HTMLElement, true)
    }

    mobileExplorer.classList.remove("hide-until-loaded")
  }
})

function setFolderState(folderElement: HTMLElement, collapsed: boolean) {
  return collapsed ? folderElement.classList.remove("open") : folderElement.classList.add("open")
}

function updateFolderToggles(folderContainer: HTMLElement, expanded: boolean) {
  const folderName =
    folderContainer.querySelector<HTMLElement>(".folder-title")?.textContent ??
    folderContainer.querySelector<HTMLButtonElement>(".folder-toggle")?.dataset.folderName ??
    ""
  for (const toggle of folderContainer.querySelectorAll<HTMLButtonElement>(
    ".folder-toggle, .folder-button",
  )) {
    toggle.setAttribute("aria-expanded", expanded.toString())
    const action = expanded ? toggle.dataset.collapseLabel : toggle.dataset.expandLabel
    if (toggle.classList.contains("folder-toggle") && action) {
      toggle.setAttribute("aria-label", `${action}: ${folderName}`)
    }
  }
}
