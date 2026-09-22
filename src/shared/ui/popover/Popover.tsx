import { cloneElement, useId, useLayoutEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import './Popover.css'

const openListeners = new Set<(contentId: string) => void>()

export interface PopoverProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  content: ReactNode
  className?: string
  disabled?: boolean
}

export function Popover({ children, content, className = '', disabled = false }: PopoverProps) {
  const contentId = useId()
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [skipExitAnimation, setSkipExitAnimation] = useState(false)
  const isOpen = !disabled && !isDismissed && (isHovered || isFocused)
  const describedBy = [children.props['aria-describedby'], isOpen ? contentId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  useLayoutEffect(() => {
    const onOtherPopoverOpen = (openedContentId: string) => {
      if (openedContentId === contentId) return
      setSkipExitAnimation(true)
      setIsDismissed(true)
    }

    openListeners.add(onOtherPopoverOpen)
    return () => {
      openListeners.delete(onOtherPopoverOpen)
    }
  }, [contentId])

  useLayoutEffect(() => {
    if (!isOpen) return
    setSkipExitAnimation(false)
    openListeners.forEach((listener) => listener(contentId))
  }, [contentId, isOpen])

  return (
    <div
      className={`popover ${className}`}
      data-open={isOpen}
      data-skip-exit-animation={skipExitAnimation}
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return
        setIsHovered(true)
        setIsDismissed(false)
      }}
      onPointerLeave={() => setIsHovered(false)}
      onPointerDown={() => setIsFocused(false)}
      onFocus={(event) => {
        if (!event.target.matches(':focus-visible')) return
        setIsFocused(true)
        setIsDismissed(false)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsDismissed(true)
      }}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <div id={contentId} className="popover__content" role="tooltip" aria-hidden={!isOpen}>
        <span className="popover__outline" aria-hidden="true" />
        {content}
      </div>
    </div>
  )
}
