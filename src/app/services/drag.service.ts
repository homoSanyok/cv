export type WindowPosition = {
  x: number
  y: number
}

class DragService {
  private storageKey(uuid: string) {
    return `window-position:${uuid}`
  }

  getPosition(uuid: string): WindowPosition | null {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(this.storageKey(uuid)) ?? 'null')

      if (
        typeof value === 'object' && value !== null &&
        'x' in value && typeof value.x === 'number' && Number.isFinite(value.x) &&
        'y' in value && typeof value.y === 'number' && Number.isFinite(value.y)
      ) {
        return { x: value.x, y: value.y }
      }
    } catch {
      // Storage may be unavailable or contain invalid data.
    }

    return null
  }

  private savePosition(uuid: string, position: WindowPosition) {
    try {
      localStorage.setItem(this.storageKey(uuid), JSON.stringify(position))
    } catch {
      // Dragging remains available when storage is disabled or full.
    }
  }

  register(uuid: string, element: HTMLElement, titlebar: HTMLElement) {
    const originalStyle = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      margin: element.style.margin,
    }
    let position: WindowPosition | null = null
    let pointer: { id: number; offsetX: number; offsetY: number } | null = null

    const place = (next: WindowPosition) => {
      const rect = element.getBoundingClientRect()

      if (!position) {
        element.style.width = `${rect.width}px`
        element.style.position = 'fixed'
        element.style.margin = '0'
      }

      position = { x: next.x, y: Math.max(0, next.y) }
      element.style.left = `${position.x}px`
      element.style.top = `${position.y}px`
    }

    const finish = () => {
      if (!pointer) return

      const { id } = pointer
      pointer = null
      delete titlebar.dataset.dragging
      if (titlebar.hasPointerCapture(id)) titlebar.releasePointerCapture(id)
      if (position) this.savePosition(uuid, position)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (
        pointer ||
        element.dataset.resizing === 'true' || !event.isPrimary || event.button !== 0 ||
        (event.target instanceof Element && event.target.closest(
          'button, a, input, select, textarea, [contenteditable], [role="button"]',
        ))
      ) return

      const rect = element.getBoundingClientRect()
      titlebar.setPointerCapture(event.pointerId)
      pointer = {
        id: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      }
      titlebar.dataset.dragging = 'true'
      event.preventDefault()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return

      place({ x: event.clientX - pointer.offsetX, y: event.clientY - pointer.offsetY })
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (pointer?.id === event.pointerId) finish()
    }

    const onResize = () => {
      if (element.dataset.maximized === 'true' || element.dataset.closed === 'true' || !position) return
      const rect = element.getBoundingClientRect()
      place({ x: rect.left, y: rect.top })
      if (position) this.savePosition(uuid, position)
    }

    const resetPosition = () => {
      position = null
      finish()
      Object.assign(element.style, originalStyle)
      try {
        localStorage.removeItem(this.storageKey(uuid))
      } catch {
        // The visible position still resets when storage is unavailable.
      }
    }

    const closedObserver = new MutationObserver(() => {
      if (element.dataset.closed === 'true') resetPosition()
    })
    closedObserver.observe(element, { attributes: true, attributeFilter: ['data-closed'] })

    if (element.dataset.closed === 'true') {
      resetPosition()
    } else {
      const saved = this.getPosition(uuid)
      if (saved) place(saved)
    }

    titlebar.addEventListener('pointerdown', onPointerDown)
    titlebar.addEventListener('pointermove', onPointerMove)
    titlebar.addEventListener('pointerup', onPointerEnd)
    titlebar.addEventListener('pointercancel', onPointerEnd)
    titlebar.addEventListener('lostpointercapture', onPointerEnd)
    window.addEventListener('blur', finish)
    window.addEventListener('resize', onResize)

    return () => {
      closedObserver.disconnect()
      finish()
      titlebar.removeEventListener('pointerdown', onPointerDown)
      titlebar.removeEventListener('pointermove', onPointerMove)
      titlebar.removeEventListener('pointerup', onPointerEnd)
      titlebar.removeEventListener('pointercancel', onPointerEnd)
      titlebar.removeEventListener('lostpointercapture', onPointerEnd)
      window.removeEventListener('blur', finish)
      window.removeEventListener('resize', onResize)
      Object.assign(element.style, originalStyle)
    }
  }
}

export const dragService = new DragService()
