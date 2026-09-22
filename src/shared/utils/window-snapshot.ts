export type ScrollPosition = { top: number; left: number }

export const SNAPSHOT_PADDING = 48

const assets = new Map<string, string>()
const urlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/g

async function embedAsset(url: string, base: string, signal: AbortSignal) {
  if (url.startsWith('data:') || url.startsWith('#')) return url

  const absoluteUrl = new URL(url, base).href
  const cached = assets.get(absoluteUrl)
  if (cached) return cached

  const response = await fetch(absoluteUrl, { signal })
  if (!response.ok) throw new Error(`Unable to capture ${absoluteUrl}`)
  const blob = await response.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  assets.set(absoluteUrl, dataUrl)
  return dataUrl
}

async function embedUrls(value: string, base: string, signal: AbortSignal) {
  const matches = Array.from(value.matchAll(urlPattern))
  const replacements = await Promise.all(matches.map(async (match) => (
    [match[0], `url("${await embedAsset(match[2], base, signal)}")`] as const
  )))
  return replacements.reduce((result, [from, to]) => result.replace(from, to), value)
}

async function captureFonts(nodes: Element[], signal: AbortSignal) {
  const usedFonts = new Set<string>()
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return
    node.style.fontFamily.split(',').forEach((family) => {
      usedFonts.add(`${family.trim().replace(/['"]/g, '')}:${node.style.fontWeight}:${node.style.fontStyle}`)
    })
  })

  const fonts: Promise<string>[] = []
  const collect = (rules: CSSRuleList, base: string) => {
    Array.from(rules).forEach((rule) => {
      if (rule instanceof CSSFontFaceRule) {
        const family = rule.style.fontFamily.replace(/['"]/g, '').trim()
        const weight = rule.style.fontWeight || '400'
        const style = rule.style.fontStyle || 'normal'
        if (usedFonts.has(`${family}:${weight}:${style}`)) {
          fonts.push(embedUrls(rule.cssText, base, signal).catch(() => ''))
        }
      } else if ('cssRules' in rule) {
        collect((rule as CSSGroupingRule).cssRules, base)
      }
    })
  }

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      collect(sheet.cssRules, sheet.href ?? document.baseURI)
    } catch {
      // Cross-origin stylesheets may not expose their font rules.
    }
  })
  return (await Promise.all(fonts)).join('\n')
}

export function restoreScrollPositions(root: HTMLElement, positions: ScrollPosition[]) {
  const nodes = [root, ...root.querySelectorAll('*')]
  positions.forEach((position, index) => {
    const node = nodes[index]
    if (!node) return
    node.scrollTop = position.top
    node.scrollLeft = position.left
  })
}

/** Rasterize an already styled window clone without changing the live window. */
export async function captureWindowSnapshot(
  preview: HTMLElement,
  width: number,
  height: number,
  positions: ScrollPosition[],
  signal: AbortSignal,
): Promise<HTMLCanvasElement> {
  const clone = preview.cloneNode(true) as HTMLElement
  const originals = [preview, ...preview.querySelectorAll('*')]
  const nodes = [clone, ...clone.querySelectorAll('*')]
  const fontStyles = captureFonts(nodes, signal)

  await Promise.all(nodes.map(async (node, index) => {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return

    const jobs: Promise<void>[] = []
    for (const property of Array.from(node.style)) {
      const value = node.style.getPropertyValue(property)
      if (!value.includes('url(')) continue
      jobs.push(embedUrls(value, document.baseURI, signal).then((embedded) => {
        node.style.setProperty(property, embedded)
      }))
    }

    if (node instanceof HTMLImageElement) {
      const original = originals[index] as HTMLImageElement
      node.removeAttribute('srcset')
      node.removeAttribute('loading')
      if (original.currentSrc || original.src) {
        jobs.push(embedAsset(original.currentSrc || original.src, document.baseURI, signal).then((src) => {
          node.src = src
        }))
      }
    } else if (node instanceof HTMLCanvasElement) {
      const original = originals[index] as HTMLCanvasElement
      const image = document.createElement('img')
      image.style.cssText = node.style.cssText
      image.src = original.toDataURL()
      node.replaceWith(image)
    } else if (node instanceof HTMLInputElement) {
      if (node.type !== 'file') node.setAttribute('value', node.value)
      node.toggleAttribute('checked', node.checked)
    } else if (node instanceof HTMLTextAreaElement) {
      node.textContent = node.value
    } else if (node instanceof HTMLSelectElement) {
      Array.from(node.options).forEach((option) => {
        option.toggleAttribute('selected', option.selected)
      })
    }

    await Promise.all(jobs)
  }))

  // SVG serialization does not retain scrollTop/scrollLeft. Move the contents
  // inside their existing clipping boxes instead of showing the top of the page.
  positions.forEach(({ top, left }, index) => {
    const node = nodes[index]
    if ((!top && !left) || !(node instanceof HTMLElement)) return
    node.style.overflow = 'hidden'
    Array.from(node.childNodes).forEach((child) => {
      let content: HTMLElement | SVGElement
      if (child instanceof HTMLElement || child instanceof SVGElement) {
        content = child
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        content = document.createElement('span')
        content.style.display = 'inline-block'
        child.replaceWith(content)
        content.append(child)
      } else {
        return
      }
      const transform = content.style.transform
      content.style.transform = `translate(${-left}px, ${-top}px) ${transform === 'none' ? '' : transform}`
    })
  })

  Object.assign(clone.style, {
    left: `${SNAPSHOT_PADDING}px`,
    top: `${SNAPSHOT_PADDING}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: 'none',
    visibility: 'visible',
  })

  const fullWidth = width + SNAPSHOT_PADDING * 2
  const fullHeight = height + SNAPSHOT_PADDING * 2
  const scale = Math.min(window.devicePixelRatio || 1, 2, 4096 / fullWidth, 4096 / fullHeight)
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `position:relative;width:${fullWidth}px;height:${fullHeight}px;`
  const style = document.createElement('style')
  style.textContent = await fontStyles
  wrapper.append(style, clone)
  const html = new XMLSerializer().serializeToString(wrapper)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(fullWidth * scale)}" height="${Math.ceil(fullHeight * scale)}" viewBox="0 0 ${fullWidth} ${fullHeight}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`
  signal.throwIfAborted()

  return new Promise((resolve, reject) => {
    const image = new Image()
    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      image.src = ''
      reject(signal.reason)
    }
    image.onload = () => {
      cleanup()
      try {
        // Upload a raster bitmap to WebGL; browsers differ in whether they
        // accept an SVG containing foreignObject directly as a texture.
        const bitmap = document.createElement('canvas')
        bitmap.width = image.naturalWidth
        bitmap.height = image.naturalHeight
        const context = bitmap.getContext('2d')
        if (!context) throw new Error('Unable to create the window bitmap')
        context.drawImage(image, 0, 0)
        resolve(bitmap)
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => { cleanup(); reject(new Error('Unable to rasterize window')) }
    signal.addEventListener('abort', abort, { once: true })
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
