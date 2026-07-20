import FlexSearch from "flexsearch"
import { ContentDetails } from "../../plugins/emitters/contentIndex"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, normalizeRelativeURLs, resolveRelative } from "../../util/path"

interface Item {
  id: number
  slug: FullSlug
  title: string
  content: string
  tags: string[]
}

// Can be expanded with things like "term" in the future
type SearchType = "basic" | "tags"
let searchType: SearchType = "basic"
let currentSearchTerm: string = ""
const normalizeSearchText = (str: string) => str.toLowerCase().replace(/ё/g, "е")
const encoder = (str: string): string[] => [
  ...(normalizeSearchText(str).match(/[\p{L}\p{N}]+/gu) ?? []),
]
let index = new FlexSearch.Document<Item>({
  charset: "latin:extra",
  encode: encoder,
  document: {
    id: "id",
    tag: "tags",
    index: [
      {
        field: "title",
        tokenize: "forward",
      },
      {
        field: "content",
        tokenize: "forward",
      },
      {
        field: "tags",
        tokenize: "forward",
      },
    ],
  },
})

const p = new DOMParser()
const fetchContentCache: Map<FullSlug, Element[]> = new Map()
const contextWindowWords = 30
const numSearchResults = 8
const numTagResults = 5

const tokenizeTerm = (term: string) => {
  const tokens = encoder(term)
  const tokenLen = tokens.length
  if (tokenLen > 1) {
    for (let i = 1; i < tokenLen; i++) {
      tokens.push(tokens.slice(0, i + 1).join(" "))
    }
  }

  return tokens.sort((a, b) => b.length - a.length) // always highlight longest terms first
}

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const searchRegex = (term: string) => new RegExp(escapeRegex(term).replace(/е/g, "[её]"), "giu")

function highlight(searchTerm: string, text: string, trim?: boolean) {
  const tokenizedTerms = tokenizeTerm(searchTerm)
  let tokenizedText = text.split(/\s+/).filter((t) => t !== "")

  let startIndex = 0
  let endIndex = tokenizedText.length - 1
  if (trim) {
    const includesCheck = (tok: string) =>
      tokenizedTerms.some((term) => normalizeSearchText(tok).includes(term))
    const occurrencesIndices = tokenizedText.map(includesCheck)

    let bestSum = 0
    let bestIndex = 0
    for (let i = 0; i < Math.max(tokenizedText.length - contextWindowWords, 0); i++) {
      const window = occurrencesIndices.slice(i, i + contextWindowWords)
      const windowSum = window.reduce((total, cur) => total + (cur ? 1 : 0), 0)
      if (windowSum >= bestSum) {
        bestSum = windowSum
        bestIndex = i
      }
    }

    startIndex = Math.max(bestIndex - contextWindowWords, 0)
    endIndex = Math.min(startIndex + 2 * contextWindowWords, tokenizedText.length - 1)
    tokenizedText = tokenizedText.slice(startIndex, endIndex)
  }

  const slice = tokenizedText
    .map((tok) => {
      // see if this tok is prefixed by any search terms
      for (const searchTok of tokenizedTerms) {
        if (normalizeSearchText(tok).includes(searchTok)) {
          const regex = searchRegex(searchTok)
          return tok.replace(regex, `<span class="highlight">$&</span>`)
        }
      }
      return tok
    })
    .join(" ")

  return `${startIndex === 0 ? "" : "..."}${slice}${
    endIndex === tokenizedText.length - 1 ? "" : "..."
  }`
}

function highlightHTML(searchTerm: string, el: HTMLElement) {
  const p = new DOMParser()
  const tokenizedTerms = tokenizeTerm(searchTerm)
  const html = p.parseFromString(el.innerHTML, "text/html")

  const createHighlightSpan = (text: string) => {
    const span = document.createElement("span")
    span.className = "highlight"
    span.textContent = text
    return span
  }

  const highlightTextNodes = (node: Node, term: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeText = node.nodeValue ?? ""
      const regex = searchRegex(term)
      const matches = nodeText.match(regex)
      if (!matches || matches.length === 0) return
      const spanContainer = document.createElement("span")
      let lastIndex = 0
      for (const match of matches) {
        const matchIndex = nodeText.indexOf(match, lastIndex)
        spanContainer.appendChild(document.createTextNode(nodeText.slice(lastIndex, matchIndex)))
        spanContainer.appendChild(createHighlightSpan(match))
        lastIndex = matchIndex + match.length
      }
      spanContainer.appendChild(document.createTextNode(nodeText.slice(lastIndex)))
      node.parentNode?.replaceChild(spanContainer, node)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as HTMLElement).classList.contains("highlight")) return
      Array.from(node.childNodes).forEach((child) => highlightTextNodes(child, term))
    }
  }

  for (const term of tokenizedTerms) {
    highlightTextNodes(html.body, term)
  }

  return html.body
}

async function setupSearch(searchElement: Element, currentSlug: FullSlug) {
  const container = searchElement.querySelector(".search-container") as HTMLElement
  if (!container) return

  const sidebar = container.closest(".sidebar") as HTMLElement | null

  const searchButton = searchElement.querySelector(".search-button") as HTMLButtonElement
  if (!searchButton) return

  const searchBar = searchElement.querySelector(".search-bar") as HTMLInputElement
  if (!searchBar) return

  const closeButton = searchElement.querySelector(".search-close") as HTMLButtonElement
  if (!closeButton) return

  const status = searchElement.querySelector(".search-status") as HTMLElement
  if (!status) return

  const searchLayout = searchElement.querySelector(".search-layout") as HTMLElement
  if (!searchLayout) return

  let data: ContentIndex | undefined
  let idDataMap: FullSlug[] = []
  const noResultsLabel = container.dataset.noResults || "No results."
  const tryAnotherSearchLabel = container.dataset.tryAnotherSearch || "Try another search term."
  let resultsFoundLabels: string[] = []
  try {
    resultsFoundLabels = JSON.parse(container.dataset.resultsFound || "[]")
  } catch {
    resultsFoundLabels = []
  }
  removeAllChildren(searchLayout)

  async function ensureSearchData() {
    if (data) return data

    container.setAttribute("aria-busy", "true")
    try {
      data = await loadSearchData()
      idDataMap = Object.keys(data) as FullSlug[]
      return data
    } finally {
      container.removeAttribute("aria-busy")
    }
  }
  const appendLayout = (el: HTMLElement) => {
    searchLayout.appendChild(el)
  }

  const enablePreview = searchLayout.dataset.preview === "true"
  let preview: HTMLDivElement | undefined = undefined
  let previewInner: HTMLDivElement | undefined = undefined
  const results = document.createElement("div")
  results.className = "results-container"
  appendLayout(results)

  if (enablePreview) {
    preview = document.createElement("div")
    preview.className = "preview-container"
    appendLayout(preview)
  }

  function hideSearch() {
    container.classList.remove("active")
    container.setAttribute("aria-hidden", "true")
    searchButton.setAttribute("aria-expanded", "false")
    document.documentElement.classList.remove("search-open")
    searchBar.value = "" // clear the input when we dismiss the search
    if (sidebar) sidebar.style.zIndex = ""
    removeAllChildren(results)
    if (preview) {
      removeAllChildren(preview)
    }
    searchLayout.classList.remove("display-results")
    searchType = "basic" // reset search type after closing
    currentHover = null
    status.textContent = ""
    searchButton.focus()
  }

  async function showSearch(searchTypeNew: SearchType) {
    searchType = searchTypeNew
    if (sidebar) sidebar.style.zIndex = "1"
    container.classList.add("active")
    container.setAttribute("aria-hidden", "false")
    searchButton.setAttribute("aria-expanded", "true")
    document.documentElement.classList.add("search-open")
    searchBar.focus()
    await ensureSearchData()
  }

  let currentHover: HTMLAnchorElement | null = null
  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "k" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const searchBarOpen = container.classList.contains("active")
      searchBarOpen ? hideSearch() : await showSearch("basic")
      return
    } else if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      // Hotkey to open tag search
      e.preventDefault()
      const searchBarOpen = container.classList.contains("active")
      searchBarOpen ? hideSearch() : await showSearch("tags")

      // add "#" prefix for tag search
      searchBar.value = "#"
      return
    }

    if (!container.classList.contains("active")) return
    const resultCards = [...results.querySelectorAll<HTMLAnchorElement>("a.result-card")]
    if (e.key === "Enter" && document.activeElement === searchBar) {
      const firstResult = resultCards[0]
      if (!firstResult) return
      await displayPreview(firstResult)
      firstResult.click()
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (resultCards.length === 0) return
      e.preventDefault()
      currentHover?.classList.remove("focus")
      const activeIndex = resultCards.indexOf(document.activeElement as HTMLAnchorElement)
      const nextIndex =
        e.key === "ArrowDown"
          ? Math.min(activeIndex + 1, resultCards.length - 1)
          : Math.max(activeIndex - 1, 0)
      const nextResult = resultCards[nextIndex]
      nextResult.focus()
      nextResult.classList.add("focus")
      currentHover = nextResult
      await displayPreview(nextResult)
    }
  }

  const formatForDisplay = (term: string, id: number) => {
    if (!data) throw new Error("Search data has not been loaded")
    const slug = idDataMap[id]
    return {
      id,
      slug,
      title: searchType === "tags" ? data[slug].title : highlight(term, data[slug].title ?? ""),
      content: highlight(term, data[slug].content ?? "", true),
      tags: highlightTags(term.substring(1), data[slug].tags),
    }
  }

  function highlightTags(term: string, tags: string[]) {
    if (!tags || searchType !== "tags") {
      return []
    }

    return tags
      .map((tag) => {
        if (tag.toLowerCase().includes(term.toLowerCase())) {
          return `<li><p class="match-tag">#${tag}</p></li>`
        } else {
          return `<li><p>#${tag}</p></li>`
        }
      })
      .slice(0, numTagResults)
  }

  function resolveUrl(slug: FullSlug): URL {
    return new URL(resolveRelative(currentSlug, slug), location.toString())
  }

  const resultToHTML = ({ slug, title, content, tags }: Item) => {
    const htmlTags = tags.length > 0 ? `<ul class="tags">${tags.join("")}</ul>` : ``
    const itemTile = document.createElement("a")
    itemTile.classList.add("result-card")
    itemTile.id = slug
    itemTile.href = resolveUrl(slug).toString()
    itemTile.innerHTML = `
      <h3 class="card-title">${title}</h3>
      ${htmlTags}
      <p class="card-description">${content}</p>
    `
    const handler = (event: MouseEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

      event.preventDefault()
      event.stopPropagation()
      const destination = new URL(itemTile.href)
      hideSearch()
      void window.spaNavigate(destination)
    }

    async function onMouseEnter(ev: MouseEvent) {
      if (!ev.target) return
      const target = (ev.target as HTMLElement).closest(".result-card") as HTMLAnchorElement | null
      if (!target) return
      currentHover?.classList.remove("focus")
      target.classList.add("focus")
      currentHover = target
      await displayPreview(target)
    }

    itemTile.addEventListener("mouseenter", onMouseEnter)
    window.addCleanup(() => itemTile.removeEventListener("mouseenter", onMouseEnter))
    itemTile.addEventListener("click", handler)
    window.addCleanup(() => itemTile.removeEventListener("click", handler))

    return itemTile
  }

  async function displayResults(finalResults: Item[]) {
    removeAllChildren(results)
    if (finalResults.length === 0) {
      const emptyResult = document.createElement("div")
      emptyResult.className = "result-card no-match"
      const heading = document.createElement("h3")
      heading.textContent = noResultsLabel
      const suggestion = document.createElement("p")
      suggestion.textContent = tryAnotherSearchLabel
      emptyResult.append(heading, suggestion)
      results.append(emptyResult)
      status.textContent = `${noResultsLabel} ${tryAnotherSearchLabel}`
    } else {
      results.append(...finalResults.map(resultToHTML))
      status.textContent =
        resultsFoundLabels[finalResults.length] ?? `${finalResults.length} results found`
    }

    if (finalResults.length === 0) {
      if (preview) removeAllChildren(preview)
      currentHover = null
      return
    }

    // Highlight the first result and prepare its preview without moving keyboard focus.
    const firstChild = results.firstElementChild as HTMLAnchorElement
    firstChild.classList.add("focus")
    currentHover = firstChild
    await displayPreview(firstChild)
  }

  async function fetchContent(slug: FullSlug): Promise<Element[]> {
    if (fetchContentCache.has(slug)) {
      return fetchContentCache.get(slug) as Element[]
    }

    const targetUrl = resolveUrl(slug).toString()
    const contents = await fetch(targetUrl)
      .then((res) => res.text())
      .then((contents) => {
        if (contents === undefined) {
          throw new Error(`Could not fetch ${targetUrl}`)
        }
        const html = p.parseFromString(contents ?? "", "text/html")
        normalizeRelativeURLs(html, targetUrl)
        const previewContent = [...html.getElementsByClassName("popover-hint")]
        for (const element of previewContent) {
          element.querySelectorAll("iframe, video, audio, object, embed").forEach((media) => {
            media.remove()
          })
          element.querySelectorAll("img").forEach((image) => {
            image.loading = "lazy"
            image.decoding = "async"
          })
        }
        return previewContent
      })

    fetchContentCache.set(slug, contents)
    return contents
  }

  async function displayPreview(el: HTMLElement | null) {
    if (!searchLayout || !enablePreview || !el || !preview) return
    const slug = el.id as FullSlug
    const innerDiv = await fetchContent(slug).then((contents) =>
      contents.flatMap((el) => [...highlightHTML(currentSearchTerm, el as HTMLElement).children]),
    )
    previewInner = document.createElement("div")
    previewInner.classList.add("preview-inner")
    previewInner.append(...innerDiv)
    preview.replaceChildren(previewInner)

    // scroll to longest
    const highlights = [...preview.getElementsByClassName("highlight")].sort(
      (a, b) => b.innerHTML.length - a.innerHTML.length,
    )
    highlights[0]?.scrollIntoView({ block: "start" })
  }

  async function onType(e: HTMLElementEventMap["input"]) {
    if (!searchLayout || !index) return
    await ensureSearchData()
    currentSearchTerm = (e.target as HTMLInputElement).value
    searchLayout.classList.toggle("display-results", currentSearchTerm !== "")
    searchType = currentSearchTerm.startsWith("#") ? "tags" : "basic"

    if (currentSearchTerm === "") {
      removeAllChildren(results)
      if (preview) removeAllChildren(preview)
      status.textContent = ""
      currentHover = null
      return
    }

    let searchResults: FlexSearch.SimpleDocumentSearchResultSetUnit[]
    if (searchType === "tags") {
      currentSearchTerm = currentSearchTerm.substring(1).trim()
      const separatorIndex = currentSearchTerm.indexOf(" ")
      if (separatorIndex != -1) {
        // search by title and content index and then filter by tag (implemented in flexsearch)
        const tag = currentSearchTerm.substring(0, separatorIndex)
        const query = currentSearchTerm.substring(separatorIndex + 1).trim()
        searchResults = await index.searchAsync({
          query: query,
          // return at least 10000 documents, so it is enough to filter them by tag (implemented in flexsearch)
          limit: Math.max(numSearchResults, 10000),
          index: ["title", "content"],
          tag: tag,
        })
        for (let searchResult of searchResults) {
          searchResult.result = searchResult.result.slice(0, numSearchResults)
        }
        // set search type to basic and remove tag from term for proper highlightning and scroll
        searchType = "basic"
        currentSearchTerm = query
      } else {
        // default search by tags index
        searchResults = await index.searchAsync({
          query: currentSearchTerm,
          limit: numSearchResults,
          index: ["tags"],
        })
      }
    } else if (searchType === "basic") {
      searchResults = await index.searchAsync({
        query: currentSearchTerm,
        limit: numSearchResults,
        index: ["title", "content"],
      })
    }

    const getByField = (field: string): number[] => {
      const results = searchResults.filter((x) => x.field === field)
      return results.length === 0 ? [] : ([...results[0].result] as number[])
    }

    // order titles ahead of content
    const allIds: Set<number> = new Set([
      ...getByField("title"),
      ...getByField("content"),
      ...getByField("tags"),
    ])
    const finalResults = [...allIds].map((id) => formatForDisplay(currentSearchTerm, id))
    await displayResults(finalResults)
  }

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => document.removeEventListener("keydown", shortcutHandler))
  const searchButtonHandler = () => void showSearch("basic")
  searchButton.addEventListener("click", searchButtonHandler)
  window.addCleanup(() => searchButton.removeEventListener("click", searchButtonHandler))
  closeButton.addEventListener("click", hideSearch)
  window.addCleanup(() => closeButton.removeEventListener("click", hideSearch))
  searchBar.addEventListener("input", onType)
  window.addCleanup(() => searchBar.removeEventListener("input", onType))

  registerEscapeHandler(container, hideSearch)
}

/**
 * Fills flexsearch document with data
 * @param index index to fill
 * @param data data to fill index with
 */
let indexPopulatePromise: Promise<void> | undefined
function fillDocument(data: ContentIndex): Promise<void> {
  indexPopulatePromise ??= (async () => {
    let id = 0
    const promises: Array<Promise<unknown>> = []
    for (const [slug, fileData] of Object.entries<ContentDetails>(data)) {
      const documentId = id++
      promises.push(
        index.addAsync(documentId, {
          id: documentId,
          slug: slug as FullSlug,
          title: fileData.title,
          content: fileData.content,
          tags: fileData.tags,
        }),
      )
    }

    await Promise.all(promises)
  })()

  return indexPopulatePromise
}

let searchDataPromise: Promise<ContentIndex> | undefined
function loadSearchData(): Promise<ContentIndex> {
  searchDataPromise ??= fetchData().then(async (data) => {
    await fillDocument(data)
    return data
  })
  return searchDataPromise!
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const currentSlug = e.detail.url
  const searchElement = document.getElementsByClassName("search")
  for (const element of searchElement) {
    await setupSearch(element, currentSlug)
  }
})
