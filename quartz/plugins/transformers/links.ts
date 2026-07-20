import { QuartzTransformerPlugin } from "../types"
import {
  FullSlug,
  RelativeURL,
  SimpleSlug,
  TransformOptions,
  stripSlashes,
  simplifySlug,
  splitAnchor,
  slugifyFilePath,
  transformLink,
} from "../../util/path"
import path from "path"
import { readFileSync } from "fs"
import { visit } from "unist-util-visit"
import isAbsoluteUrl from "is-absolute-url"
import { Properties, Root } from "hast"

interface Options {
  /** How to resolve Markdown paths */
  markdownLinkResolution: TransformOptions["strategy"]
  /** Strips folders from a link so that it looks nice */
  prettyLinks: boolean
  openLinksInNewTab: boolean
  lazyLoad: boolean
  externalLinkIcon: boolean
}

const defaultOptions: Options = {
  markdownLinkResolution: "absolute",
  prettyLinks: true,
  openLinksInNewTab: false,
  lazyLoad: true,
  externalLinkIcon: true,
}

type ImageDimensions = { width: number; height: number }

function parseImageDimensions(buffer: Buffer, extension: string): ImageDimensions | undefined {
  if (extension === ".png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }

  if (extension === ".gif" && buffer.length >= 10 && buffer.toString("ascii", 0, 3) === "GIF") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
  }

  if (extension === ".bmp" && buffer.length >= 26 && buffer.toString("ascii", 0, 2) === "BM") {
    return { width: Math.abs(buffer.readInt32LE(18)), height: Math.abs(buffer.readInt32LE(22)) }
  }

  if ((extension === ".jpg" || extension === ".jpeg") && buffer.length >= 4) {
    const startOfFrameMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ])
    let offset = 2
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++
        continue
      }

      const marker = buffer[offset + 1]
      offset += 2
      if (marker === 0xd8 || marker === 0xd9) continue
      if (offset + 2 > buffer.length) break
      const segmentLength = buffer.readUInt16BE(offset)
      if (startOfFrameMarkers.has(marker) && offset + 7 < buffer.length) {
        return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) }
      }
      if (segmentLength < 2) break
      offset += segmentLength
    }
  }

  if (extension === ".webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF") {
    const chunk = buffer.toString("ascii", 12, 16)
    if (chunk === "VP8X") {
      return {
        width: buffer.readUIntLE(24, 3) + 1,
        height: buffer.readUIntLE(27, 3) + 1,
      }
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      }
    }
    if (chunk === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
  }

  if (extension === ".svg") {
    const source = buffer.subarray(0, Math.min(buffer.length, 64 * 1024)).toString("utf8")
    const numericAttribute = (name: string) => {
      const match = source.match(new RegExp(`\\b${name}=["']([0-9]+(?:\\.[0-9]+)?)`, "i"))
      return match ? Number(match[1]) : undefined
    }
    const width = numericAttribute("width")
    const height = numericAttribute("height")
    if (width && height) return { width: Math.round(width), height: Math.round(height) }

    const viewBox = source.match(/\bviewBox=["']([^"']+)["']/i)?.[1]
    const viewBoxValues = viewBox?.trim().split(/[ ,]+/).map(Number)
    if (viewBoxValues?.length === 4 && viewBoxValues.every(Number.isFinite)) {
      return { width: Math.round(viewBoxValues[2]), height: Math.round(viewBoxValues[3]) }
    }
  }
}

function numericDimension(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value.trim())) return undefined
  const dimension = Number(value)
  return dimension > 0 ? dimension : undefined
}

function applyImageDimensions(properties: Properties, intrinsic: ImageDimensions) {
  const requestedWidth = numericDimension(properties.width)
  const requestedHeight = numericDimension(properties.height)
  const width =
    requestedWidth ??
    (requestedHeight
      ? Math.round((requestedHeight * intrinsic.width) / intrinsic.height)
      : intrinsic.width)
  const height = requestedHeight ?? Math.round((width * intrinsic.height) / intrinsic.width)
  properties.width = width
  properties.height = height
}

export const CrawlLinks: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "LinkProcessing",
    htmlPlugins(ctx) {
      const fileBySlug = new Map(
        ctx.allFiles.map((filePath) => [slugifyFilePath(filePath), filePath] as const),
      )
      const dimensionCache = new Map<string, ImageDimensions | null>()

      const dimensionsForSlug = (slug: FullSlug): ImageDimensions | undefined => {
        const filePath = fileBySlug.get(slug)
        if (!filePath) return
        if (dimensionCache.has(filePath)) return dimensionCache.get(filePath) ?? undefined

        try {
          const extension = path.extname(filePath).toLowerCase()
          const dimensions = parseImageDimensions(
            readFileSync(path.join(ctx.argv.directory, filePath)),
            extension,
          )
          dimensionCache.set(filePath, dimensions ?? null)
          return dimensions
        } catch {
          dimensionCache.set(filePath, null)
          return
        }
      }

      return [
        () => {
          return (tree: Root, file) => {
            const curSlug = simplifySlug(file.data.slug!)
            const outgoing: Set<SimpleSlug> = new Set()

            const transformOptions: TransformOptions = {
              strategy: opts.markdownLinkResolution,
              allSlugs: ctx.allSlugs,
            }

            visit(tree, "element", (node, _index, _parent) => {
              // rewrite all links
              if (
                node.tagName === "a" &&
                node.properties &&
                typeof node.properties.href === "string"
              ) {
                let dest = node.properties.href as RelativeURL
                const classes = (node.properties.className ?? []) as string[]
                const isExternal = isAbsoluteUrl(dest)
                classes.push(isExternal ? "external" : "internal")

                if (isExternal && opts.externalLinkIcon) {
                  node.children.push({
                    type: "element",
                    tagName: "svg",
                    properties: {
                      "aria-hidden": "true",
                      class: "external-icon",
                      style: "max-width:0.8em;max-height:0.8em",
                      viewBox: "0 0 512 512",
                    },
                    children: [
                      {
                        type: "element",
                        tagName: "path",
                        properties: {
                          d: "M320 0H288V64h32 82.7L201.4 265.4 178.7 288 224 333.3l22.6-22.6L448 109.3V192v32h64V192 32 0H480 320zM32 32H0V64 480v32H32 456h32V480 352 320H424v32 96H64V96h96 32V32H160 32z",
                        },
                        children: [],
                      },
                    ],
                  })
                }

                // Check if the link has alias text
                if (
                  node.children.length === 1 &&
                  node.children[0].type === "text" &&
                  node.children[0].value !== dest
                ) {
                  // Add the 'alias' class if the text content is not the same as the href
                  classes.push("alias")
                }
                node.properties.className = classes

                if (isExternal && opts.openLinksInNewTab) {
                  node.properties.target = "_blank"
                }

                // don't process external links or intra-document anchors
                const isInternal = !(isAbsoluteUrl(dest) || dest.startsWith("#"))
                if (isInternal) {
                  dest = node.properties.href = transformLink(
                    file.data.slug!,
                    dest,
                    transformOptions,
                  )

                  // url.resolve is considered legacy
                  // WHATWG equivalent https://nodejs.dev/en/api/v18/url/#urlresolvefrom-to
                  const url = new URL(dest, "https://base.com/" + stripSlashes(curSlug, true))
                  const canonicalDest = url.pathname
                  let [destCanonical, _destAnchor] = splitAnchor(canonicalDest)
                  if (destCanonical.endsWith("/")) {
                    destCanonical += "index"
                  }

                  // need to decodeURIComponent here as WHATWG URL percent-encodes everything
                  const full = decodeURIComponent(stripSlashes(destCanonical, true)) as FullSlug
                  const simple = simplifySlug(full)
                  outgoing.add(simple)
                  node.properties["data-slug"] = full

                  if (new URL(dest, "https://base.com").pathname.toLowerCase().endsWith(".pdf")) {
                    node.properties["data-no-popover"] = "true"
                  }
                }

                // rewrite link internals if prettylinks is on
                if (
                  opts.prettyLinks &&
                  isInternal &&
                  node.children.length === 1 &&
                  node.children[0].type === "text" &&
                  !node.children[0].value.startsWith("#")
                ) {
                  node.children[0].value = path.basename(node.children[0].value)
                }
              }

              // transform all other resources that may use links
              if (
                ["img", "video", "audio", "iframe", "source"].includes(node.tagName) &&
                node.properties &&
                typeof node.properties.src === "string"
              ) {
                const classes = Array.isArray(node.properties.className)
                  ? node.properties.className.map(String)
                  : typeof node.properties.className === "string"
                    ? node.properties.className.split(/\s+/)
                    : []
                const isHeroMedia = classes.includes("home-gif")
                const isHeroImage = node.tagName === "img" && isHeroMedia

                if (node.tagName === "img") {
                  if (node.properties.width === "auto") delete node.properties.width
                  if (node.properties.height === "auto") delete node.properties.height
                  node.properties.decoding = "async"
                  if (isHeroImage) {
                    node.properties.loading = "eager"
                    node.properties.fetchPriority = "high"
                  } else if (opts.lazyLoad) {
                    node.properties.loading = "lazy"
                  }
                } else if (opts.lazyLoad && node.tagName === "iframe") {
                  node.properties.loading = "lazy"
                } else if (
                  opts.lazyLoad &&
                  (node.tagName === "video" || node.tagName === "audio")
                ) {
                  node.properties.preload = "metadata"
                }

                if (!isAbsoluteUrl(node.properties.src)) {
                  let dest = node.properties.src as RelativeURL
                  dest = node.properties.src = transformLink(
                    file.data.slug!,
                    dest,
                    transformOptions,
                  )
                  node.properties.src = dest

                  if (node.tagName === "img") {
                    const url = new URL(dest, "https://base.com/" + stripSlashes(curSlug, true))
                    let canonical = url.pathname
                    if (canonical.endsWith("/")) canonical += "index"
                    const full = decodeURIComponent(stripSlashes(canonical, true)) as FullSlug
                    const dimensions = dimensionsForSlug(full)
                    if (dimensions) applyImageDimensions(node.properties, dimensions)
                  }
                }
              }
            })

            file.data.links = [...outgoing]
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    links: SimpleSlug[]
  }
}
