import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
// @ts-ignore
import script from "./scripts/footer.inline"

interface ReportErrorOptions {
  label: string
  href: string
}

interface Options {
  links: Record<string, string>
  reportError?: ReportErrorOptions
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? {}
    const reportError = opts?.reportError
    return (
      <footer class={`${displayClass ?? ""}`}>
        <p class="footer-brand">© {year} Endurance</p>
        <ul>
          {reportError && (
            <li class="report-error-item">
              <a
                href={reportError.href}
                class="report-error-link"
                data-report-error
                aria-describedby="footer-report-hint"
              >
                {reportError.label}
              </a>
              <span id="footer-report-hint" class="report-error-hint">
                URL страницы скопируется автоматически
              </span>
            </li>
          )}
          {Object.entries(links).map(([text, link]) => (
            <li>
              <a href={link}>{text}</a>
            </li>
          ))}
        </ul>
        <p class="footer-report-status" role="status" aria-live="polite"></p>
      </footer>
    )
  }

  Footer.css = style
  Footer.afterDOMLoaded = script
  return Footer
}) satisfies QuartzComponentConstructor
