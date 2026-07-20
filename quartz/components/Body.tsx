// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
import clipboardStyle from "./styles/clipboard.scss"
import { JSX } from "preact"
import { i18n } from "../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children, cfg }: QuartzComponentProps) => {
  const skipLabel = i18n(cfg.locale).components.accessibility?.skipToContent ?? "Skip to content"

  return (
    <>
      <a class="skip-link" href="#quartz-content">
        {skipLabel}
      </a>
      <div id="quartz-body">
        {children.map((child) => {
          const element = child as JSX.Element
          if (element?.props?.class === "center") {
            return (
              <main id="quartz-content" class="center" tabindex={-1}>
                {element.props.children}
              </main>
            )
          }

          return child
        })}
      </div>
    </>
  )
}

Body.afterDOMLoaded = clipboardScript
Body.css = clipboardStyle

export default (() => Body) satisfies QuartzComponentConstructor
