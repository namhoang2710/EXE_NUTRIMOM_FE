"use client"

import { forwardRef, useLayoutEffect, useRef, useState, type HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import './vercel-tabs.css'

export interface Tab {
  id: string
  label: string
  /** Navigation tabs remain real links; tabs without a destination render as buttons. */
  to?: string
}

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  tabs: readonly Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

interface TabBox {
  left: number
  top: number
  width: number
  height: number
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onTabChange, ...props }, forwardedRef) => {
    const [selectedId, setSelectedId] = useState(tabs[0]?.id)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [focusedId, setFocusedId] = useState<string | null>(null)
    const [hoverBox, setHoverBox] = useState<TabBox | null>(null)
    const [activeBox, setActiveBox] = useState<TabBox | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const tabRefs = useRef(new Map<string, HTMLElement>())
    const value = activeTab ?? (tabs.some(tab => tab.id === selectedId) ? selectedId : tabs[0]?.id)
    const highlightedId = hoveredId ?? focusedId

    useLayoutEffect(() => {
      const root = rootRef.current
      if (!root) return
      let disposed = false

      function measure(id: string | null | undefined): TabBox | null {
        const tab = id ? tabRefs.current.get(id) : undefined
        if (!tab || !root || root.offsetWidth === 0) return null
        const bounds = root.getBoundingClientRect()
        const rect = tab.getBoundingClientRect()
        return {
          left: rect.left - bounds.left + root.scrollLeft - root.clientLeft,
          top: rect.top - bounds.top + root.scrollTop - root.clientTop,
          width: rect.width,
          height: rect.height,
        }
      }

      function update() {
        if (disposed) return
        setActiveBox(measure(value))
        setHoverBox(measure(highlightedId))
      }

      update()
      const observer = new ResizeObserver(update)
      observer.observe(root)
      for (const tab of tabRefs.current.values()) observer.observe(tab)
      void document.fonts.ready.then(update)
      return () => { disposed = true; observer.disconnect() }
    }, [tabs, value, highlightedId])

    function selectTab(id: string) {
      if (activeTab === undefined) setSelectedId(id)
      onTabChange?.(id)
    }

    return (
      <div
        {...props}
        ref={node => {
          rootRef.current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) forwardedRef.current = node
        }}
        className={cn('vercel-tabs', className)}
      >
        <div className="vercel-tabs-hover" aria-hidden="true" style={{ ...hoverBox, opacity: hoverBox ? 1 : 0 }} />
        <div
          className="vercel-tabs-indicator"
          aria-hidden="true"
          style={{ left: activeBox?.left, width: activeBox?.width, top: activeBox ? activeBox.top + activeBox.height + 4 : 0, opacity: activeBox ? 1 : 0 }}
        />
        <div className="vercel-tabs-track">
          {tabs.map(tab => {
            const selected = tab.id === value
            const triggerProps = {
              ref: (node: HTMLElement | null) => {
                if (node) tabRefs.current.set(tab.id, node)
                else tabRefs.current.delete(tab.id)
              },
              className: cn('vercel-tabs-trigger', selected && 'is-active'),
              onPointerEnter: () => setHoveredId(tab.id),
              onPointerLeave: () => setHoveredId(null),
              onFocus: () => setFocusedId(tab.id),
              onBlur: () => setFocusedId(null),
              onClick: () => selectTab(tab.id),
            }
            return tab.to !== undefined ? (
              <Link key={tab.id} to={tab.to} aria-current={selected ? 'page' : undefined} {...triggerProps}>{tab.label}</Link>
            ) : (
              <button key={tab.id} type="button" aria-pressed={selected} {...triggerProps}>{tab.label}</button>
            )
          })}
        </div>
      </div>
    )
  },
)
Tabs.displayName = 'Tabs'

export { Tabs }
