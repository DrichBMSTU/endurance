function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return document.execCommand("copy")
  } finally {
    textarea.remove()
  }
}

async function copyPageReference(): Promise<boolean> {
  const reference = `Ошибка на странице: ${window.location.href}`
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(reference)
      return true
    } catch {
      return fallbackCopy(reference)
    }
  }

  return fallbackCopy(reference)
}

document.addEventListener("nav", () => {
  const reportLink = document.querySelector<HTMLAnchorElement>("[data-report-error]")
  const status = document.querySelector<HTMLElement>(".footer-report-status")
  if (!reportLink) return

  const reportError = (event: MouseEvent) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return
    event.preventDefault()

    const telegramWindow = window.open("about:blank", "_blank")
    if (telegramWindow) {
      telegramWindow.opener = null
      telegramWindow.location.replace(reportLink.href)
    }
    void copyPageReference().then((copied) => {
      if (status) {
        status.textContent = copied
          ? "URL страницы скопирован. Вставьте его в сообщение Telegram."
          : "Не удалось скопировать URL. Скопируйте адрес страницы из строки браузера."
      }
    })

    if (!telegramWindow) window.location.assign(reportLink.href)
  }

  reportLink.addEventListener("click", reportError)
  window.addCleanup(() => reportLink.removeEventListener("click", reportError))
})
