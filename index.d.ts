declare module "*.scss" {
  const content: string
  export = content
}

// dom custom event
interface CustomEventMap {
  prenav: CustomEvent<{}>
  nav: CustomEvent<{ url: FullSlug }>
  themechange: CustomEvent<{ theme: "light" | "dark" }>
}

type ContentIndex = Record<FullSlug, ContentDetails>
type ContentIndexMetadata = Record<FullSlug, ContentMetadata>
declare const fetchData: () => Promise<ContentIndex>
declare const fetchDataMetadata: () => Promise<ContentIndexMetadata>
