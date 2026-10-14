import {
  createGenieEffect,
  GENIE_MINIMIZE_DURATION,
  GENIE_RESTORE_DURATION,
  smoothStep,
} from '../../shared/utils/genie-effect'
import type { GenieRect } from '../../shared/utils/genie-effect'
import { captureWindowSnapshot, restoreScrollPositions } from '../../shared/utils/window-snapshot'
import type { ScrollPosition } from '../../shared/utils/window-snapshot'

export type DockWindow = {
  uuid: string
  title: string
  appName: string
  appIcon: string
  focusOnMount: boolean
  phase: 'minimizing' | 'minimized' | 'restoring'
}

export type DockApplication = {
  name: string
  icon: string
  hasOpenWindows: boolean
}

type DockElements = {
  container: HTMLElement
  slot: HTMLElement
  button: HTMLButtonElement
}

type WindowState = 'open' | 'closed' | 'minimized'

type RegisteredWindow = {
  element: HTMLElement
  title: string
  appName: string
  appIcon: string
  originalMinimized: string | null
  originalInert: boolean
  preview: HTMLElement | null
  width: number
  height: number
  scrollPositions: ScrollPosition[]
  phase: WindowState | 'preparing' | DockWindow['phase']
  dock: DockElements | null
  image: HTMLCanvasElement | null
  snapshot: Promise<HTMLCanvasElement | null> | null
  capture: AbortController | null
  cancelAnimation: (() => void) | null
  dockAnimation: Animation | null
}

const emptyWindows: readonly DockWindow[] = []
const emptyApplications: readonly DockApplication[] = []

class DockService {
  private windows = new Map<string, RegisteredWindow>()
  private listeners = new Set<() => void>()
  private minimizedWindows: readonly DockWindow[] = emptyWindows
  private applications: readonly DockApplication[] = emptyApplications

  private storageKey(uuid: string) {
    return `window-state:${uuid}`
  }

  private readState(uuid: string): WindowState | null {
    try {
      const state = localStorage.getItem(this.storageKey(uuid))
      if (state === 'open' || state === 'closed' || state === 'minimized') return state

      // The legacy flag only identified minimized windows unambiguously.
      return localStorage.getItem(`window-minimized:${uuid}`) === 'true' ? 'minimized' : null
    } catch {
      return null
    }
  }

  private saveState(uuid: string, state: WindowState) {
    try {
      localStorage.setItem(this.storageKey(uuid), state)
    } catch {
      // Windows remain usable when storage is disabled or full.
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = () => this.minimizedWindows
  getServerSnapshot = () => emptyWindows
  getApplicationsSnapshot = () => this.applications
  getApplicationsServerSnapshot = () => emptyApplications

  private notify() {
    const applications = new Map<string, DockApplication>()
    this.windows.forEach((entry) => {
      const hasOpenWindows = entry.phase !== 'closed'
      const application = applications.get(entry.appName)
      if (application) {
        application.hasOpenWindows ||= hasOpenWindows
      } else {
        applications.set(entry.appName, {
          name: entry.appName,
          icon: entry.appIcon,
          hasOpenWindows,
        })
      }
    })
    this.applications = Array.from(applications.values())
    this.listeners.forEach((listener) => listener())
  }

  register(uuid: string, title: string, element: HTMLElement, appName: string, appIcon: string, defaultOpen = false) {
    const entry: RegisteredWindow = {
      element,
      title,
      appName,
      appIcon,
      originalMinimized: element.getAttribute('data-minimized'),
      originalInert: element.inert,
      preview: null,
      width: 0,
      height: 0,
      scrollPositions: [],
      phase: this.readState(uuid) ?? (defaultOpen ? 'open' : 'closed'),
      dock: null,
      image: null,
      snapshot: null,
      capture: null,
      cancelAnimation: null,
      dockAnimation: null,
    }

    this.windows.set(uuid, entry)
    if (entry.phase === 'closed') {
      this.hideWindow(entry)
      entry.element.dataset.closed = 'true'
      this.notify()
    } else if (entry.phase === 'minimized') {
      this.createPreview(entry)
      this.hideWindow(entry)
      this.addToDock(uuid, entry, false)
      // Prepare the texture before the first click on a persisted miniature.
      void this.prepareSnapshot(entry)
    } else {
      this.notify()
    }

    return () => {
      if (this.windows.get(uuid) !== entry) return

      this.windows.delete(uuid)
      entry.capture?.abort()
      entry.cancelAnimation?.()
      entry.dockAnimation?.cancel()
      this.showWindow(entry)
      if (this.minimizedWindows.some((item) => item.uuid === uuid)) {
        this.minimizedWindows = this.minimizedWindows.filter((item) => item.uuid !== uuid)
      }
      this.notify()
      // Keep the saved state when the component unmounts.
    }
  }

  activateApplication(appName: string) {
    let minimizedWindow: string | undefined
    let closedWindow: [string, RegisteredWindow] | undefined
    let hasRunningWindow = false
    for (const [uuid, entry] of this.windows) {
      if (entry.appName !== appName) continue
      if (entry.phase === 'closed') {
        closedWindow ??= [uuid, entry]
        continue
      }
      hasRunningWindow = true
      if (entry.phase === 'open') {
        entry.element.focus({ preventScroll: true })
        return
      }
      if (entry.phase === 'minimized') minimizedWindow ??= uuid
    }
    if (minimizedWindow !== undefined) {
      this.restore(minimizedWindow)
    } else if (!hasRunningWindow && closedWindow) {
      const [uuid, entry] = closedWindow
      entry.phase = 'open'
      this.saveState(uuid, 'open')
      this.showWindow(entry)
      this.notify()
      entry.element.focus({ preventScroll: true })
    }
  }

  closeAll() {
    for (const [uuid, entry] of this.windows) {
      if (entry.element.matches('.cv-settings') || entry.element.querySelector('.cv-settings')) continue
      this.close(uuid)
    }
  }

  close(uuid: string) {
    const entry = this.windows.get(uuid)
    if (!entry || entry.phase === 'closed') return

    entry.phase = 'closed'
    entry.capture?.abort()
    entry.cancelAnimation?.()
    entry.dockAnimation?.cancel()
    entry.capture = null
    entry.dockAnimation = null
    entry.preview = null
    entry.image = null
    entry.snapshot = null
    entry.scrollPositions = []
    this.hideWindow(entry)
    entry.element.dataset.closed = 'true'
    this.minimizedWindows = this.minimizedWindows.filter((item) => item.uuid !== uuid)
    this.saveState(uuid, 'closed')
    this.notify()
  }

  private createPreview(entry: RegisteredWindow) {
    const { element } = entry
    const rect = element.getBoundingClientRect()
    const preview = element.cloneNode(true) as HTMLElement
    const sources = [element, ...element.querySelectorAll('*')]
    const copies = [preview, ...preview.querySelectorAll('*')]

    entry.width = Math.max(1, rect.width)
    entry.height = Math.max(1, rect.height)
    entry.scrollPositions = sources.map((source, index) => {
      const copy = copies[index]

      // Inline the rendered styles so the snapshot also works inside a shadow root.
      if (copy instanceof HTMLElement || copy instanceof SVGElement) {
        const styles = getComputedStyle(source)
        for (let i = 0; i < styles.length; i += 1) {
          const property = styles[i]
          copy.style.setProperty(property, styles.getPropertyValue(property))
        }
        copy.style.setProperty('animation', 'none')
        copy.style.setProperty('transition', 'none')
      }

      if (source instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
        if (source.type !== 'file') copy.value = source.value
        copy.checked = source.checked
      } else if (source instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) {
        copy.value = source.value
      } else if (source instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) {
        Array.from(source.options).forEach((option, optionIndex) => {
          copy.options[optionIndex].selected = option.selected
        })
      } else if (source instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
        try {
          if (source.width && source.height) copy.getContext('2d')?.drawImage(source, 0, 0)
        } catch {
          // A canvas without an available bitmap must not prevent minimizing.
        }
      }

      return { top: source.scrollTop, left: source.scrollLeft }
    })

    Object.assign(preview.style, {
      position: 'absolute',
      inset: 'auto',
      width: `${entry.width}px`,
      height: `${entry.height}px`,
      minWidth: '0',
      minHeight: '0',
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      visibility: 'visible',
      pointerEvents: 'none',
      transformOrigin: 'top left',
      transform: 'none',
    })
    preview.inert = true
    entry.preview = preview
  }

  private hideWindow(entry: RegisteredWindow) {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && entry.element.contains(activeElement)) {
      activeElement.blur()
    }
    entry.element.dataset.minimized = 'true'
    entry.element.inert = true
  }

  private addToDock(uuid: string, entry: RegisteredWindow, focusOnMount: boolean) {
    this.minimizedWindows = [...this.minimizedWindows, {
      uuid,
      title: entry.title,
      appName: entry.appName,
      appIcon: entry.appIcon,
      focusOnMount,
      phase: entry.phase === 'minimizing' ? 'minimizing' : 'minimized',
    }]
    this.notify()
  }

  private setDockPhase(uuid: string, phase: DockWindow['phase'], focusOnMount = false) {
    this.minimizedWindows = this.minimizedWindows.map((item) => (
      item.uuid === uuid ? { ...item, phase, focusOnMount } : item
    ))
    this.notify()
  }

  private reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  private prepareSnapshot(entry: RegisteredWindow) {
    if (entry.snapshot) return entry.snapshot
    if (!entry.preview) return Promise.resolve(null)

    const controller = new AbortController()
    entry.capture = controller
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(3000)])
    entry.snapshot = captureWindowSnapshot(
      entry.preview, entry.width, entry.height, entry.scrollPositions, signal,
    ).catch(() => null).then((image) => {
      if (!controller.signal.aborted) entry.image = image
      return image
    })
    return entry.snapshot
  }

  minimize(uuid: string) {
    const entry = this.windows.get(uuid)
    if (!entry || entry.phase !== 'open') return

    entry.phase = 'preparing'
    this.saveState(uuid, 'minimized')
    this.createPreview(entry)
    entry.element.inert = true

    const start = () => {
      if (this.windows.get(uuid) !== entry || entry.phase !== 'preparing') return

      if (this.reducedMotion()) {
        entry.phase = 'minimized'
        this.hideWindow(entry)
        this.addToDock(uuid, entry, true)
      } else {
        entry.phase = 'minimizing'
        this.addToDock(uuid, entry, false)
        this.animate(uuid, entry, 'minimize')
      }
    }

    if (this.reducedMotion()) start()
    else void this.prepareSnapshot(entry).then(start)
  }

  private showWindow(entry: RegisteredWindow) {
    delete entry.element.dataset.closed
    if (entry.originalMinimized === null) {
      delete entry.element.dataset.minimized
    } else {
      entry.element.setAttribute('data-minimized', entry.originalMinimized)
    }
    entry.element.inert = entry.originalInert
  }

  restore(uuid: string) {
    const entry = this.windows.get(uuid)
    if (!entry || entry.phase !== 'minimized') return

    const target = this.dockTarget(entry)
    entry.phase = 'restoring'
    this.saveState(uuid, 'open')
    // Remove the icon immediately, but retain its slot while the Dock contracts.
    if (entry.dock) {
      entry.dock.button.style.opacity = '0'
      entry.dock.button.inert = true
      entry.dock.button.disabled = true
      if (!this.reducedMotion()) {
        entry.dockAnimation = entry.dock.slot.animate([
          { width: '76px', marginLeft: '9px' },
          { width: '0px', marginLeft: '0px' },
        ], {
          duration: GENIE_RESTORE_DURATION,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards',
        })
      }
    }
    this.setDockPhase(uuid, 'restoring')

    if (this.reducedMotion()) {
      this.finishRestore(uuid, entry)
      return
    }

    void this.prepareSnapshot(entry).then(() => {
      if (this.windows.get(uuid) === entry && entry.phase === 'restoring') {
        this.animate(uuid, entry, 'restore', target)
      }
    })
  }

  private finishRestore(uuid: string, entry: RegisteredWindow) {
    this.showWindow(entry)
    entry.phase = 'open'
    entry.capture?.abort()
    entry.capture = null
    if (entry.dock) {
      entry.dock.slot.style.width = '0px'
      entry.dock.slot.style.marginLeft = '0px'
    }
    entry.dockAnimation?.cancel()
    entry.dockAnimation = null
    entry.preview = null
    entry.image = null
    entry.snapshot = null
    entry.scrollPositions = []
    this.minimizedWindows = this.minimizedWindows.filter((item) => item.uuid !== uuid)
    this.notify()
    entry.element.focus({ preventScroll: true })
  }

  private dockTarget(entry: RegisteredWindow): GenieRect {
    // Include the miniature's horizontal scaling while its Dock slot expands.
    if (entry.dock && entry.preview?.isConnected) {
      const { left, top, width, height } = entry.preview.getBoundingClientRect()
      return { left, top, width, height }
    }

    const scale = Math.min(68 / entry.width, 48 / entry.height)
    const width = entry.width * scale
    const height = entry.height * scale
    return {
      left: (window.innerWidth - width) / 2,
      top: window.innerHeight - height - 18,
      width,
      height,
    }
  }

  private revealDock(entry: RegisteredWindow, space: number, reveal: number) {
    if (!entry.dock) return
    const { slot, button, container } = entry.dock
    slot.style.width = `${76 * space}px`
    slot.style.marginLeft = `${9 * space}px`
    button.style.opacity = '1'
    // The painted button and its padding always fit the currently open slot.
    button.style.transform = space === 1 ? 'none' : `scaleX(${space})`
    button.style.clipPath = 'none'
    button.style.setProperty('--dock-reveal', String(reveal))
    // Reveal the actual miniature, excluding the button's empty padding.
    // Every revealed pixel keeps its original color and opacity.
    const scale = Math.min(container.clientWidth / entry.width, container.clientHeight / entry.height)
    const previewHeight = entry.height * scale
    const inset = (container.clientHeight - previewHeight) / 2
    container.style.clipPath = reveal === 1
      ? 'none'
      : `inset(${inset + previewHeight * (1 - reveal)}px 0 ${inset}px 0)`
  }

  private animate(
    uuid: string,
    entry: RegisteredWindow,
    direction: 'minimize' | 'restore',
    restoreTarget?: GenieRect,
  ) {
    const minimizing = direction === 'minimize'
    const duration = minimizing ? GENIE_MINIMIZE_DURATION : GENIE_RESTORE_DURATION
    let effect: ReturnType<typeof createGenieEffect> | null = null
    let started: number | null = null
    let frame = 0

    entry.cancelAnimation = () => {
      cancelAnimationFrame(frame)
      effect?.dispose()
      effect = null
      entry.cancelAnimation = null
    }

    const tick = (now: number) => {
      if (!entry.preview || this.windows.get(uuid) !== entry) return
      started ??= now
      const t = Math.min(1, (now - started) / duration)
      if (minimizing) {
        this.revealDock(entry, smoothStep(t), t)
      }
      effect ??= createGenieEffect(
        entry.image, entry.preview, entry.scrollPositions, entry.width, entry.height,
      )
      effect.draw(
        entry.element.getBoundingClientRect(),
        restoreTarget ?? this.dockTarget(entry),
        minimizing ? t : 1 - t,
        minimizing ? 1 - smoothStep((t - 0.86) / 0.14) : 1,
      )
      // Swap the DOM window for its texture in the same animation frame.
      if (started === now) this.hideWindow(entry)

      if (t < 1) {
        frame = requestAnimationFrame(tick)
        return
      }

      if (minimizing) {
        this.revealDock(entry, 1, 1)
        entry.phase = 'minimized'
        this.setDockPhase(uuid, 'minimized', true)
      } else {
        this.finishRestore(uuid, entry)
      }
      // Reveal the real window/miniature before retiring the rendered frame.
      entry.cancelAnimation?.()
    }
    frame = requestAnimationFrame(tick)
  }

  mountPreview(uuid: string, container: HTMLElement, slot: HTMLElement, button: HTMLButtonElement) {
    const entry = this.windows.get(uuid)
    if (!entry?.preview) return

    const dock = { container, slot, button }
    entry.dock = dock

    // Isolate duplicate IDs and keep the miniature's controls non-interactive.
    const root = container.shadowRoot ?? container.attachShadow({ mode: 'open' })
    const scale = Math.min(container.clientWidth / entry.width, container.clientHeight / entry.height)
    Object.assign(entry.preview.style, {
      left: `${(container.clientWidth - entry.width * scale) / 2}px`,
      top: `${(container.clientHeight - entry.height * scale) / 2}px`,
      transform: `scale(${scale})`,
    })
    root.replaceChildren(entry.preview)
    restoreScrollPositions(entry.preview, entry.scrollPositions)
    if (entry.phase === 'minimizing') this.revealDock(entry, 0, 0)

    return () => {
      root.replaceChildren()
      if (entry.dock === dock) entry.dock = null
    }
  }
}

export const dockService = new DockService()
