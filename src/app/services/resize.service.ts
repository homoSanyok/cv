type WindowRect = { left: number; top: number; width: number; height: number }
type WindowResizeState = {
  rect: WindowRect
  maximized: boolean
  maximizedPosition?: Pick<WindowRect, 'left' | 'top'>
}
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const directions: readonly string[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

class ResizeService {
  private windows = new Map<string, { toggle: () => void }>()

  private readState(uuid: string): WindowResizeState | null {
    try {
      const state: unknown = JSON.parse(localStorage.getItem(`window-resize:${uuid}`) ?? 'null')
      if (typeof state !== 'object' || state === null ||
        !('maximized' in state) || typeof state.maximized !== 'boolean' ||
        !('rect' in state)) return null
      const rect = state.rect
      if (typeof rect !== 'object' || rect === null ||
        !('left' in rect) || typeof rect.left !== 'number' || !Number.isFinite(rect.left) ||
        !('top' in rect) || typeof rect.top !== 'number' || !Number.isFinite(rect.top) ||
        !('width' in rect) || typeof rect.width !== 'number' || !Number.isFinite(rect.width) || rect.width <= 0 ||
        !('height' in rect) || typeof rect.height !== 'number' || !Number.isFinite(rect.height) || rect.height <= 0
      ) return null
      const position = 'maximizedPosition' in state ? state.maximizedPosition : null
      const maximizedPosition = typeof position === 'object' && position !== null &&
        'left' in position && typeof position.left === 'number' && Number.isFinite(position.left) &&
        'top' in position && typeof position.top === 'number' && Number.isFinite(position.top)
        ? { left: position.left, top: Math.max(0, position.top) }
        : undefined
      return {
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        maximized: state.maximized,
        maximizedPosition,
      }
    } catch {
      // Ignore unavailable storage and invalid saved state.
      return null
    }
  }

  toggleMaximize(uuid: string) {
    this.windows.get(uuid)?.toggle()
  }

  register(
    uuid: string,
    element: HTMLElement,
    titlebar: HTMLElement,
    onMaximized: (maximized: boolean) => void,
  ) {
    const originalStyle = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      height: element.style.height,
      margin: element.style.margin,
    }
    let restoreRect: WindowRect | null = null
    let maximizeAnimation: Animation | null = null

    const cancelMaximizeAnimation = () => {
      maximizeAnimation?.cancel()
      maximizeAnimation = null
    }
    let pointer: {
      id: number
      handle: HTMLElement
      direction: ResizeDirection
      x: number
      y: number
      rect: WindowRect
      previousCursor: string
    } | null = null

    const viewport = () => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    })

    const maximizedRect = (): WindowRect => {
      const bounds = viewport()
      const dock = element.closest('.app')?.querySelector<HTMLElement>(':scope > .app__dock')
      const bottom = dock?.getClientRects().length
        ? dock.getBoundingClientRect().top
        : bounds.height

      return {
        left: 0,
        top: 0,
        width: bounds.width,
        height: Math.max(0, Math.min(bounds.height, bottom)),
      }
    }

    const isAtMaximizedRect = (rect = maximizedRect()) => (
      (['left', 'top', 'width', 'height'] as const).every(
        (key) => Math.abs(parseFloat(element.style[key]) - rect[key]) < 1,
      )
    )

    const updateMaximized = () => {
      onMaximized(restoreRect !== null && isAtMaximizedRect())
    }

    const place = (rect: WindowRect) => {
      const bounds = viewport()
      const width = Math.min(bounds.width, rect.width)
      const height = Math.min(bounds.height, rect.height)
      Object.assign(element.style, {
        position: 'fixed',
        margin: '0',
        left: `${rect.left}px`,
        top: `${Math.max(0, rect.top)}px`,
        width: `${width}px`,
        height: `${height}px`,
      })
      element.dataset.sized = 'true'
    }

    const saveState = () => {
      if (element.dataset.sized !== 'true') return
      // Inline geometry holds the destination during animation and survives hiding.
      const rect = restoreRect ?? {
        left: parseFloat(element.style.left),
        top: parseFloat(element.style.top),
        width: parseFloat(element.style.width),
        height: parseFloat(element.style.height),
      }
      if (!Object.values(rect).every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return
      try {
        const state: WindowResizeState = { rect, maximized: restoreRect !== null }
        if (restoreRect) {
          state.maximizedPosition = {
            left: parseFloat(element.style.left),
            top: parseFloat(element.style.top),
          }
        }
        localStorage.setItem(`window-resize:${uuid}`, JSON.stringify(state))
      } catch {
        // Resizing remains available when storage is disabled or full.
      }
    }

    const finish = () => {
      if (!pointer) return
      const { id, handle, previousCursor } = pointer
      pointer = null
      delete element.dataset.resizing
      delete document.documentElement.dataset.windowResizing
      if (previousCursor) {
        document.documentElement.style.setProperty('--resize-cursor', previousCursor)
      } else {
        document.documentElement.style.removeProperty('--resize-cursor')
      }
      if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id)
      saveState()
    }

    const toggle = () => {
      if (element.inert || element.dataset.closed === 'true') return
      finish()
      const from = element.getBoundingClientRect()
      const fromRadius = getComputedStyle(element).borderRadius
      cancelMaximizeAnimation()
      const target = maximizedRect()
      if (restoreRect && isAtMaximizedRect(target)) {
        place(restoreRect)
        restoreRect = null
        delete element.dataset.maximized
      } else {
        if (!restoreRect) {
          const { left, top, width, height } = element.getBoundingClientRect()
          restoreRect = { left, top, width, height }
        }
        element.dataset.maximized = 'true'
        place(target)
      }
      const animation = element.animate([
        {
          left: `${from.left}px`,
          top: `${from.top}px`,
          width: `${from.width}px`,
          height: `${from.height}px`,
          borderRadius: fromRadius,
        },
        {
          left: element.style.left,
          top: element.style.top,
          width: element.style.width,
          height: element.style.height,
          borderRadius: getComputedStyle(element).borderRadius,
        },
      ], { duration: 500, easing: 'ease-in-out' })
      maximizeAnimation = animation
      animation.onfinish = () => {
        if (maximizeAnimation === animation) maximizeAnimation = null
      }
      updateMaximized()
      saveState()
      element.focus({ preventScroll: true })
    }

    const onDoubleClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(
        'button, a, input, select, textarea, [contenteditable], [role="button"]',
      )) return
      event.preventDefault()
      toggle()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (pointer || element.inert || !event.isPrimary || event.button !== 0) return
      const handle = event.target
      if (!(handle instanceof HTMLElement) || handle.parentElement !== element) return
      const direction = handle.dataset.resizeDirection
      if (!direction || !directions.includes(direction)) return
      event.preventDefault()
      handle.setPointerCapture(event.pointerId)
      const { left, top, width, height } = element.getBoundingClientRect()
      pointer = {
        id: event.pointerId,
        handle,
        direction: direction as ResizeDirection,
        x: event.clientX,
        y: event.clientY,
        rect: { left, top, width, height },
        previousCursor: document.documentElement.style.getPropertyValue('--resize-cursor'),
      }
      element.dataset.resizing = 'true'
      document.documentElement.dataset.windowResizing = 'true'
      document.documentElement.style.setProperty('--resize-cursor', getComputedStyle(handle).cursor)
      element.focus({ preventScroll: true })
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return
      const { rect, direction, x, y } = pointer
      const bounds = viewport()
      const dx = event.clientX - x
      const dy = event.clientY - y
      const minWidth = Math.min(280, bounds.width, rect.width)
      const minHeight = Math.min(160, bounds.height, rect.height)
      let { left, top } = rect
      let right = rect.left + rect.width
      let bottom = rect.top + rect.height
      if (direction.includes('w')) left = Math.max(right - bounds.width, Math.min(right - minWidth, rect.left + dx))
      if (direction.includes('e')) right = Math.max(left + minWidth, Math.min(left + bounds.width, rect.left + rect.width + dx))
      if (direction.includes('n')) top = Math.max(0, bottom - bounds.height, Math.min(bottom - minHeight, rect.top + dy))
      if (direction.includes('s')) bottom = Math.max(top + minHeight, Math.min(top + bounds.height, rect.top + rect.height + dy))
      const resizedRect = { left, top, width: right - left, height: bottom - top }
      if (restoreRect && (resizedRect.width !== rect.width || resizedRect.height !== rect.height)) {
        restoreRect = null
        delete element.dataset.maximized
      }
      place(resizedRect)
      updateMaximized()
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (pointer?.id === event.pointerId) finish()
      // Drag events bubble from the titlebar after its position has been updated.
      updateMaximized()
      saveState()
    }

    const onResize = () => {
      finish()
      cancelMaximizeAnimation()
      if (restoreRect) {
        place({
          ...maximizedRect(),
          left: parseFloat(element.style.left),
          top: parseFloat(element.style.top),
        })
      } else if (element.dataset.sized === 'true') {
        // Hidden windows have an empty bounding box; retain their stored geometry.
        place({
          left: parseFloat(element.style.left),
          top: parseFloat(element.style.top),
          width: parseFloat(element.style.width),
          height: parseFloat(element.style.height),
        })
      }
      updateMaximized()
      saveState()
    }

    const entry = { toggle }
    this.windows.set(uuid, entry)
    const saved = this.readState(uuid)
    if (saved) {
      if (saved.maximized) {
        restoreRect = saved.rect
        element.dataset.maximized = 'true'
        place({ ...maximizedRect(), ...saved.maximizedPosition })
      } else {
        place(saved.rect)
      }
    }
    updateMaximized()
    titlebar.addEventListener('dblclick', onDoubleClick)
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerEnd)
    element.addEventListener('pointercancel', onPointerEnd)
    element.addEventListener('lostpointercapture', onPointerEnd)
    window.addEventListener('blur', finish)
    window.addEventListener('blur', saveState)
    window.addEventListener('pagehide', saveState)
    window.addEventListener('resize', onResize)
    // Finish the transition before a new drag or resize starts.
    element.addEventListener('pointerdown', onInteraction, true)

    function onInteraction(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest('button')) return
      cancelMaximizeAnimation()
    }

    return () => {
      finish()
      saveState()
      cancelMaximizeAnimation()
      element.removeEventListener('pointerdown', onInteraction, true)
      if (this.windows.get(uuid) === entry) this.windows.delete(uuid)
      titlebar.removeEventListener('dblclick', onDoubleClick)
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerEnd)
      element.removeEventListener('pointercancel', onPointerEnd)
      element.removeEventListener('lostpointercapture', onPointerEnd)
      window.removeEventListener('blur', finish)
      window.removeEventListener('blur', saveState)
      window.removeEventListener('pagehide', saveState)
      window.removeEventListener('resize', onResize)
      delete element.dataset.maximized
      delete element.dataset.sized
      Object.assign(element.style, originalStyle)
    }
  }
}

export const resizeService = new ResizeService()
