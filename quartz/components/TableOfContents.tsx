import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import legacyStyle from "./styles/legacyToc.scss"
import modernStyle from "./styles/toc.scss"
import { classNames } from "../util/lang"

// @ts-ignore
import script from "./scripts/toc.inline"
import { i18n } from "../i18n"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

interface Options {
  layout: "modern" | "legacy"
  collapsed?: boolean
}

const defaultOptions: Options = {
  layout: "modern",
}

export default ((opts?: Partial<Options>) => {
  const layout = opts?.layout ?? defaultOptions.layout
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()
  const TableOfContents: QuartzComponent = ({
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    if (!fileData.toc) {
      return null
    }

    const translations = i18n(cfg.locale).components.tableOfContents
    const collapsed = opts?.collapsed ?? fileData.collapseToc
    const contentId = displayClass === "mobile-only" ? "toc-content-mobile" : "toc-content-desktop"

    return (
      <div class={classNames(displayClass, "toc")}>
        <button
          type="button"
          class={collapsed ? "collapsed toc-header" : "toc-header"}
          aria-controls={contentId}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? (translations.expand ?? translations.title)
              : (translations.collapse ?? translations.title)
          }
          data-expand-label={translations.expand ?? translations.title}
          data-collapse-label={translations.collapse ?? translations.title}
        >
          <h3>{translations.title}</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
            aria-hidden="true"
            focusable="false"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div
          id={contentId}
          class={collapsed ? "collapsed toc-content-wrapper" : "toc-content-wrapper"}
          aria-hidden={collapsed}
          inert={collapsed}
        >
          <OverflowList class="toc-content">
            {fileData.toc.map((tocEntry) => (
              <li key={tocEntry.slug} class={`depth-${tocEntry.depth}`}>
                <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
                  {tocEntry.text}
                </a>
              </li>
            ))}
          </OverflowList>
        </div>
      </div>
    )
  }

  TableOfContents.css = modernStyle
  TableOfContents.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)

  const LegacyTableOfContents: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
    if (!fileData.toc) {
      return null
    }
    return (
      <details class="toc" open={!(opts?.collapsed ?? fileData.collapseToc)}>
        <summary>
          <h3>{i18n(cfg.locale).components.tableOfContents.title}</h3>
        </summary>
        <ul>
          {fileData.toc.map((tocEntry) => (
            <li key={tocEntry.slug} class={`depth-${tocEntry.depth}`}>
              <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
                {tocEntry.text}
              </a>
            </li>
          ))}
        </ul>
      </details>
    )
  }
  LegacyTableOfContents.css = legacyStyle

  return layout === "modern" ? TableOfContents : LegacyTableOfContents
}) satisfies QuartzComponentConstructor
