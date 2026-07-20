import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/search.scss"
// @ts-ignore
import script from "./scripts/search.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

export interface SearchOptions {
  enablePreview: boolean
}

const defaultOptions: SearchOptions = {
  enablePreview: true,
}

export default ((userOpts?: Partial<SearchOptions>) => {
  const Search: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const opts = { ...defaultOptions, ...userOpts }
    const translations = i18n(cfg.locale).components.search
    const searchPlaceholder = translations.searchBarPlaceholder
    const resultsFound = Array.from(
      { length: 9 },
      (_, count) => translations.resultsFound?.({ count }) ?? `${count} results found`,
    )
    return (
      <div class={classNames(displayClass, "search")}>
        <button
          type="button"
          class="search-button"
          aria-haspopup="dialog"
          aria-controls="search-dialog"
          aria-expanded="false"
        >
          <p>{translations.title}</p>
          <svg
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 19.9 19.7"
          >
            <g class="search-path" fill="none">
              <path stroke-linecap="square" d="M18.5 18.3l-5.4-5.4" />
              <circle cx="8" cy="8" r="7" />
            </g>
          </svg>
        </button>
        <div
          id="search-dialog"
          class="search-container"
          role="dialog"
          aria-modal="true"
          aria-hidden="true"
          aria-label={translations.dialogLabel ?? translations.title}
          data-no-results={translations.noResults ?? "No results."}
          data-try-another-search={translations.tryAnotherSearch ?? "Try another search term."}
          data-results-found={JSON.stringify(resultsFound)}
        >
          <div class="search-space">
            <div class="search-controls">
              <input
                autocomplete="off"
                class="search-bar"
                name="search"
                type="search"
                aria-label={searchPlaceholder}
                aria-describedby="search-status"
                placeholder={searchPlaceholder}
              />
              <button
                type="button"
                class="search-close"
                aria-label={translations.close ?? "Close search"}
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <p
              id="search-status"
              class="search-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            />
            <div class="search-layout" data-preview={opts.enablePreview}></div>
          </div>
        </div>
      </div>
    )
  }

  Search.afterDOMLoaded = script
  Search.css = style

  return Search
}) satisfies QuartzComponentConstructor
