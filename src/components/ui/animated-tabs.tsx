"use client"

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AnimatedTab {
  value: string
  label: string
  suffix?: ReactNode
}

interface AnimatedTabsProps {
  tabs: readonly AnimatedTab[]
  value?: string
  className?: string
}

export function AnimatedTabs({ tabs, value, className }: AnimatedTabsProps) {
  const clipRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<string, HTMLSpanElement>())

  useLayoutEffect(() => {
    const clipNode = clipRef.current
    if (!clipNode) return

    function updateClipPath(clipElement: HTMLDivElement) {
      const activeTab = value ? tabRefs.current.get(value) : undefined
      if (!activeTab || clipElement.offsetWidth === 0) {
        clipElement.style.opacity = '0'
        return
      }

      const left = activeTab.offsetLeft
      const right = left + activeTab.offsetWidth
      const clipRight = Math.max(0, clipElement.offsetWidth - right)
      clipElement.style.clipPath = `inset(0 ${clipRight}px 0 ${left}px round 999px)`
      clipElement.style.opacity = '1'
    }

    const update = () => updateClipPath(clipNode)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(clipNode)
    return () => observer.disconnect()
  }, [tabs, value])

  return (
    <div ref={clipRef} className={cn('nm-animated-tabs-clip', className)} aria-hidden="true">
      <div className="nm-animated-tabs-track">
        {tabs.map((tab) => (
          <span
            ref={(node) => {
              if (node) tabRefs.current.set(tab.value, node)
              else tabRefs.current.delete(tab.value)
            }}
            key={tab.value}
            className="nm-animated-tabs-item"
          >
            {tab.label}{tab.suffix}
          </span>
        ))}
      </div>
    </div>
  )
}
