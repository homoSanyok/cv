import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { dockService } from '../../../app/services/dock.service'
import { dragService } from '../../../app/services/drag.service'
import { resizeService } from '../../../app/services/resize.service'
import './Window.css'

export type WindowProps = {
  /** Use a stable UUID to preserve the window state across reloads. */
  uuid?: string
  title: string
  /** Windows with the same appName share one application icon in the Dock. */
  appName: string
  appIcon: string
  /** Open when no saved window state exists. Defaults to false. */
  defaultOpen?: boolean
  children?: ReactNode
  className?: string
}

export function Window({ uuid, title, appName, appIcon, defaultOpen = false, children, className }: WindowProps) {
  const windowRef = useRef<HTMLElement>(null)
  const titlebarRef = useRef<HTMLElement>(null)
  const generatedId = useId()
  const windowId = uuid ?? generatedId
  const titleId = useId()
  const [isActive, setIsActive] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useLayoutEffect(() => {
    if (!windowRef.current || !titlebarRef.current) return

    const unregisterDrag = dragService.register(windowId, windowRef.current, titlebarRef.current)
    const unregisterResize = resizeService.register(
      windowId, windowRef.current, titlebarRef.current, setIsMaximized,
    )

    return () => {
      unregisterResize()
      unregisterDrag()
    }
  }, [windowId])

  useLayoutEffect(() => {
    if (!windowRef.current) return

    return dockService.register(windowId, title, windowRef.current, appName, appIcon, defaultOpen)
  }, [windowId, title, appName, appIcon, defaultOpen])

  useEffect(() => {
    const windows = windowRef.current?.parentElement?.querySelectorAll(
      ':scope > .window:not([data-minimized="true"]):not([data-closed="true"])',
    )

    if (windows?.length) {
      setIsActive(windowRef.current === windows[windows.length - 1])
    }

    const updateActiveWindow = (event: Event) => {
      setIsActive(
        event.target instanceof Node &&
          Boolean(windowRef.current?.contains(event.target)),
      )
    }

    document.addEventListener('pointerdown', updateActiveWindow)
    document.addEventListener('focusin', updateActiveWindow)

    return () => {
      document.removeEventListener('pointerdown', updateActiveWindow)
      document.removeEventListener('focusin', updateActiveWindow)
    }
  }, [])

  return (
    <section
      id={windowId}
      ref={windowRef}
      className={['window', className].filter(Boolean).join(' ')}
      data-active={isActive}
      aria-labelledby={titleId}
      tabIndex={0}
    >
      <header ref={titlebarRef} className="window__titlebar">
        <div className="window__controls" role="group" aria-label="Управление окном">
          <button
            type="button"
            className="window__control window__control--close"
            aria-label="Закрыть"
            onClick={() => dockService.close(windowId)}
          />
          <button
            type="button"
            className="window__control window__control--minimize"
            aria-label="Свернуть"
            onClick={() => dockService.minimize(windowId)}
          />
          <button
            type="button"
            className="window__control window__control--maximize"
            aria-label={isMaximized ? 'Восстановить размер' : 'Развернуть'}
            aria-pressed={isMaximized}
            onClick={() => resizeService.toggleMaximize(windowId)}
          />
        </div>
        <h2 className="window__title" id={titleId}>{title}</h2>
      </header>
      <div className="window__content">{children}</div>
      {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map((direction) => (
        <div
          key={direction}
          className={`window__resize window__resize--${direction}`}
          data-resize-direction={direction}
          aria-hidden="true"
        />
      ))}
    </section>
  )
}
