import { dragService } from '../../../app/services/drag.service'

const gap = 16
const cascadeOffset = 32

/** Arrange untouched default windows after their saved geometry has been restored. */
export function layoutDefaultWindows(container: HTMLElement, windowIds: readonly string[]) {
  const ids = new Set(windowIds)
  const elements = Array.from(container.children).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && ids.has(element.id),
  )
  const originalPositions = elements.map((element) => ({
    element,
    left: element.style.left,
    top: element.style.top,
  }))
  const interacted = new Set<HTMLElement>()

  const onPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof Element)) return
    const element = event.target.closest<HTMLElement>('.window')
    if (element && elements.includes(element)) interacted.add(element)
  }

  const arrange = () => {
    const windows = elements.filter((element) => (
      !interacted.has(element) &&
      element.dataset.closed !== 'true' &&
      element.dataset.minimized !== 'true' &&
      element.dataset.sized !== 'true' &&
      !dragService.getPosition(element.id)
    )).map((element) => ({ element, rect: element.getBoundingClientRect() }))
    if (!windows.length) return

    const bounds = container.getBoundingClientRect()
    const dock = container.parentElement?.querySelector<HTMLElement>(':scope > .app__dock')
    const bottom = dock?.getClientRects().length
      ? Math.min(bounds.bottom, dock.getBoundingClientRect().top)
      : bounds.bottom
    const width = Math.max(0, bounds.width)
    const height = Math.max(0, bottom - bounds.top)
    const place = (element: HTMLElement, left: number, top: number) => {
      element.style.left = `${Math.max(0, left)}px`
      element.style.top = `${Math.max(0, top)}px`
    }

    // Prefer rows, then try wrapping into more rows before allowing overlap.
    for (let columns = windows.length; columns >= 1; columns -= 1) {
      const rows = []
      for (let index = 0; index < windows.length; index += columns) {
        const items = windows.slice(index, index + columns)
        rows.push({
          items,
          width: items.reduce((sum, item) => sum + item.rect.width, 0) + gap * (items.length - 1),
          height: Math.max(...items.map((item) => item.rect.height)),
        })
      }
      const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) + gap * (rows.length - 1)
      if (totalHeight > height || rows.some((row) => row.width > width)) continue

      let top = (height - totalHeight) / 2
      for (const row of rows) {
        let left = (width - row.width) / 2
        for (const { element, rect } of row.items) {
          place(element, left, top + (row.height - rect.height) / 2)
          left += rect.width + gap
        }
        top += row.height + gap
      }
      return
    }

    // Spread the cascade horizontally as far as possible, exposing each titlebar.
    let nextLeft = 0
    const offsets = windows.map(({ rect }) => {
      const left = nextLeft
      nextLeft += rect.width + gap
      return left
    })
    const scale = Math.max(0, Math.min(1, ...windows.slice(1).map(({ rect }, index) => (
      (width - rect.width) / offsets[index + 1]
    ))))
    const titlebarHeight = Math.max(...windows.map(({ element }) => (
      element.querySelector<HTMLElement>('.window__titlebar')?.offsetHeight ?? cascadeOffset
    )))
    const step = windows.length > 1
      ? Math.min(cascadeOffset, Math.max(0, height - titlebarHeight) / (windows.length - 1))
      : 0
    const totalWidth = Math.max(...windows.map(({ rect }, index) => rect.width + offsets[index] * scale))
    const totalHeight = Math.max(...windows.map(({ rect }, index) => rect.height + index * step))
    const left = Math.max(0, (width - totalWidth) / 2)
    const top = Math.max(0, (height - totalHeight) / 2)

    windows.forEach(({ element }, index) => {
      place(element, left + offsets[index] * scale, top + index * step)
    })
  }

  arrange()
  container.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('resize', arrange)

  return () => {
    container.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('resize', arrange)
    for (const { element, left, top } of originalPositions) {
      element.style.left = left
      element.style.top = top
    }
  }
}
