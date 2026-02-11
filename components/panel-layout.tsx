// Documentation & usage examples: ./panel-layout.md

"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"
import {
  DEFAULT_WIDTH,
  MAX_WIDTH,
  MIN_WIDTH,
  PanelLayoutContext,
  STORAGE_KEY,
  usePanelLayout,
} from "@/hooks/use-panel-layout"
import type { PanelLayoutContextValue } from "@/hooks/use-panel-layout"

// ---------------------------------------------------------------------------
// Media query helpers for useSyncExternalStore
// ---------------------------------------------------------------------------

function subscribeToMdBreakpoint(callback: () => void) {
  const mq = window.matchMedia("(min-width: 768px)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

function getIsMobileSnapshot() {
  return !window.matchMedia("(min-width: 768px)").matches
}

function getIsMobileServerSnapshot() {
  return false
}

// ---------------------------------------------------------------------------
// Read persisted width from localStorage (safe for SSR)
// ---------------------------------------------------------------------------

function readStoredWidth(storageKey: string, fallback: number): number {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) {
      const parsed = Number(stored)
      if (!Number.isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed
      }
    }
  } catch {}
  return fallback
}

// ---------------------------------------------------------------------------
// PanelLayout (Provider + wrapper)
// ---------------------------------------------------------------------------

function PanelLayout({
  defaultWidth = DEFAULT_WIDTH,
  storageKey = STORAGE_KEY,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  defaultWidth?: number
  storageKey?: string
}) {
  const [leftWidth, setLeftWidthState] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)

  // Hydrate leftWidth from localStorage after mount (same pattern as sidebar.tsx)
  useEffect(() => {
    const stored = readStoredWidth(storageKey, defaultWidth)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== defaultWidth) setLeftWidthState(stored)
  }, [storageKey, defaultWidth])
  const [activePanel, setActivePanel] = useState<"left" | "right">("left")

  const isMobile = useSyncExternalStore(
    subscribeToMdBreakpoint,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  )

  const setLeftWidth = useCallback(
    (w: number) => {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))
      setLeftWidthState(clamped)
      try {
        localStorage.setItem(storageKey, String(clamped))
      } catch {}
    },
    [storageKey]
  )

  const showDetail = useCallback(() => setActivePanel("right"), [])
  const showList = useCallback(() => setActivePanel("left"), [])

  const value = useMemo<PanelLayoutContextValue>(
    () => ({
      leftWidth,
      setLeftWidth,
      isResizing,
      setIsResizing,
      activePanel,
      setActivePanel,
      showDetail,
      showList,
      isMobile,
    }),
    [leftWidth, setLeftWidth, isResizing, activePanel, showDetail, showList, isMobile]
  )

  return (
    <PanelLayoutContext.Provider value={value}>
      <div
        data-slot="panel-layout"
        className={cn(
          isMobile
            ? "relative h-full w-full overflow-hidden"
            : "flex h-full w-full overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </PanelLayoutContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// PanelLeft
// ---------------------------------------------------------------------------

function PanelLeft({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { leftWidth, activePanel, isMobile } = usePanelLayout()

  return (
    <div
      data-slot="panel-left"
      data-active={activePanel === "left" ? "" : undefined}
      className={cn(
        isMobile
          ? "absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none"
          : "h-full shrink-0 overflow-hidden",
        className
      )}
      style={
        isMobile
          ? { transform: activePanel === "left" ? "translateX(0)" : "translateX(-100%)" }
          : { width: leftWidth }
      }
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelRight
// ---------------------------------------------------------------------------

function PanelRight({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { activePanel, isMobile } = usePanelLayout()

  return (
    <div
      data-slot="panel-right"
      data-active={activePanel === "right" ? "" : undefined}
      className={cn(
        isMobile
          ? "absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none"
          : "h-full min-w-0 flex-1 overflow-hidden",
        className
      )}
      style={
        isMobile
          ? { transform: activePanel === "right" ? "translateX(0)" : "translateX(100%)" }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelResizer
// ---------------------------------------------------------------------------

function PanelResizer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { leftWidth, setLeftWidth, isResizing, setIsResizing } = usePanelLayout()
  const widthRef = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setIsResizing(true)

      const layout = (e.currentTarget as HTMLElement).closest<HTMLElement>(
        '[data-slot="panel-layout"]'
      )
      const panelLeft = layout?.querySelector<HTMLElement>(
        '[data-slot="panel-left"]'
      )

      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"

      const onPointerMove = (ev: PointerEvent) => {
        if (!layout || !panelLeft) return
        const containerLeft = layout.getBoundingClientRect().left
        const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX - containerLeft))
        widthRef.current = clamped
        panelLeft.style.width = `${clamped}px`
      }

      const onPointerUp = () => {
        setIsResizing(false)
        if (widthRef.current) setLeftWidth(widthRef.current)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
        document.removeEventListener("pointermove", onPointerMove)
        document.removeEventListener("pointerup", onPointerUp)
      }

      document.addEventListener("pointermove", onPointerMove)
      document.addEventListener("pointerup", onPointerUp)
    },
    [setLeftWidth, setIsResizing]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 50 : 10
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setLeftWidth(leftWidth - step)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setLeftWidth(leftWidth + step)
      }
    },
    [leftWidth, setLeftWidth]
  )

  return (
    <div
      data-slot="panel-resizer"
      data-resizing={isResizing ? "" : undefined}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuenow={leftWidth}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      className={cn(
        "hidden w-1 shrink-0 cursor-col-resize items-center justify-center md:flex",
        "group/resizer relative",
        "focus-visible:outline-none",
        className
      )}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div
        className={cn(
          "h-full w-px bg-border transition-[width,background-color] motion-reduce:transition-none",
          "group-hover/resizer:w-1 group-hover/resizer:bg-border",
          "group-focus-visible/resizer:w-1 group-focus-visible/resizer:bg-primary",
          "group-data-[resizing]/resizer:w-1 group-data-[resizing]/resizer:bg-primary"
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { PanelLayout, PanelLeft, PanelResizer, PanelRight }
