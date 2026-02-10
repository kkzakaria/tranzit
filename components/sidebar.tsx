// Documentation & usage examples: ./sidebar.md

"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Tooltip } from "@base-ui/react/tooltip"
import { Cancel01Icon, Menu01Icon, Pin02Icon, PinOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  SidebarContext,
  SIDEBAR_PINNED_KEY,
  useSidebar,
} from "@/hooks/use-sidebar"
import type { MobileMode, SidebarContextValue } from "@/hooks/use-sidebar"

// ---------------------------------------------------------------------------
// SidebarProvider
// ---------------------------------------------------------------------------

function SidebarProvider({
  defaultPinned = false,
  mobileMode = "drawer",
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { defaultPinned?: boolean; mobileMode?: MobileMode }) {
  const [pinned, setPinnedState] = useState(defaultPinned)
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer when viewport crosses md breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const handler = () => {
      if (mq.matches) setMobileOpen(false)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_PINNED_KEY)
    if (stored !== null) {
      setPinnedState(stored === "true")
    }
  }, [])

  const setPinned = useCallback((value: boolean) => {
    setPinnedState(value)
    localStorage.setItem(SIDEBAR_PINNED_KEY, String(value))
  }, [])

  const togglePinned = useCallback(() => {
    setPinnedState((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_PINNED_KEY, String(next))
      return next
    })
  }, [])

  const expanded = pinned || hovered

  const value = useMemo<SidebarContextValue>(
    () => ({ pinned, hovered, expanded, mobileOpen, mobileMode, setPinned, togglePinned, setHovered, setMobileOpen }),
    [pinned, hovered, expanded, mobileOpen, mobileMode, setPinned, togglePinned]
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-provider"
        className={cn("flex h-screen w-full overflow-hidden", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  collapsedWidth = 48,
  expandedWidth = 208,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  collapsedWidth?: number
  expandedWidth?: number
}) {
  const { pinned, expanded, setHovered } = useSidebar()

  const state = expanded ? "expanded" : "collapsed"

  return (
    <>
      {/* Desktop sidebar */}
      <div
        data-slot="sidebar-wrapper"
        className="hidden shrink-0 transition-[width] duration-200 ease-linear md:block"
        style={{ width: pinned ? expandedWidth : collapsedWidth }}
      >
        <aside
          role="navigation"
          aria-label="Main navigation"
          data-slot="sidebar"
          data-state={state}
          data-pinned={pinned ? "" : undefined}
          className={cn(
            "group/sidebar hidden h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:flex",
            pinned ? "relative" : "absolute inset-y-0 left-0 z-10",
            className
          )}
          style={{ width: expanded ? expandedWidth : collapsedWidth }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setHovered(false)
            }
          }}
          {...props}
        >
          {children}
        </aside>
      </div>

      {/* Mobile drawer */}
      <SidebarMobile expandedWidth={expandedWidth}>
        {children}
      </SidebarMobile>
    </>
  )
}

// ---------------------------------------------------------------------------
// SidebarMobile
// ---------------------------------------------------------------------------

const mobileModeConfig = {
  drawer: {
    position: "fixed inset-x-0 bottom-0",
    animation: "data-[open]:slide-in-from-bottom data-[closed]:slide-out-to-bottom",
    sizing: "max-h-[85vh] w-full rounded-t-2xl",
  },
  "sheet-left": {
    position: "fixed inset-y-0 left-0",
    animation: "data-[open]:slide-in-from-left data-[closed]:slide-out-to-left",
    sizing: "h-full w-[280px] max-w-[85vw]",
  },
  "sheet-right": {
    position: "fixed inset-y-0 right-0",
    animation: "data-[open]:slide-in-from-right data-[closed]:slide-out-to-right",
    sizing: "h-full w-[280px] max-w-[85vw]",
  },
} as const

function SidebarMobile({
  expandedWidth,
  children,
}: {
  expandedWidth: number
  children: React.ReactNode
}) {
  const { mobileOpen, setMobileOpen, mobileMode } = useSidebar()
  const config = mobileModeConfig[mobileMode]

  // Swipe-to-close refs (drawer mode only)
  const popupRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    if (popupRef.current) {
      popupRef.current.style.transition = "none"
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (deltaY > 0 && popupRef.current) {
      popupRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current
      if (!popupRef.current) return

      popupRef.current.style.transition = "transform 200ms"

      if (deltaY > 80) {
        popupRef.current.style.transform = "translateY(100%)"
        setTimeout(() => setMobileOpen(false), 200)
      } else {
        popupRef.current.style.transform = "translateY(0)"
      }
    },
    [setMobileOpen]
  )

  const drawerTouchHandlers =
    mobileMode === "drawer"
      ? {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
        }
      : {}

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/60",
            "data-[open]:animate-in data-[open]:fade-in-0",
            "data-[closed]:animate-out data-[closed]:fade-out-0"
          )}
        />
        <Dialog.Popup
          ref={popupRef}
          {...drawerTouchHandlers}
          className={cn(
            "z-50 bg-sidebar text-sidebar-foreground shadow-lg",
            config.position,
            config.sizing,
            "data-[open]:animate-in",
            "data-[closed]:animate-out",
            config.animation
          )}
        >
          {mobileMode === "drawer" && (
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-sidebar-foreground/20" />
          )}
          <Dialog.Close
            className={cn(
              "absolute top-3 flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              mobileMode === "sheet-right" ? "left-3" : "right-3"
            )}
            aria-label="Close menu"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </Dialog.Close>
          <aside
            role="navigation"
            aria-label="Main navigation"
            data-slot="sidebar"
            data-state="expanded"
            className={cn(
              "group/sidebar flex flex-col overflow-y-auto px-2 pb-6",
              mobileMode === "drawer" ? "pt-4" : "pt-12"
            )}
            style={{ maxWidth: mobileMode === "drawer" ? expandedWidth * 2 : undefined }}
          >
            {children}
          </aside>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------------------------------------------------------------------------
// SidebarTrigger (mobile hamburger)
// ---------------------------------------------------------------------------

function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { setMobileOpen } = useSidebar()

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      className={cn(
        "flex size-9 items-center justify-center rounded-md text-foreground outline-none transition-colors md:hidden",
        "hover:bg-foreground/[0.08]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={() => setMobileOpen(true)}
      aria-label="Open menu"
      {...props}
    >
      <HugeiconsIcon icon={Menu01Icon} className="size-5" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// SidebarHeader
// ---------------------------------------------------------------------------

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex shrink-0 items-center px-3 py-3", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarContent
// ---------------------------------------------------------------------------

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarGroup
// ---------------------------------------------------------------------------

function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-1 py-1", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarGroupLabel
// ---------------------------------------------------------------------------

function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "truncate px-2 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground transition-opacity duration-200",
        "group-data-[state=collapsed]/sidebar:hidden",
        "group-data-[state=expanded]/sidebar:opacity-100",
        className
      )}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarGroupContent
// ---------------------------------------------------------------------------

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-group-content"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarItem
// ---------------------------------------------------------------------------

function SidebarItem({
  icon,
  active,
  href,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"li">, "children"> & {
  icon: IconSvgElement
  active?: boolean
  href?: string
  children: React.ReactNode
}) {
  const { expanded, setMobileOpen } = useSidebar()

  const Comp = href ? "a" : "button"

  const inner = (
    <li data-slot="sidebar-item" className={cn("list-none")} {...props}>
      <Comp
        href={href as string}
        data-active={active ? "" : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2 group-data-[state=collapsed]/sidebar:gap-0 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-colors",
          "hover:bg-foreground/[0.08] hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          className
        )}
        onClick={() => setMobileOpen(false)}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <HugeiconsIcon icon={icon} className="size-4" />
        </span>
        <span
          className={cn(
            "truncate transition-opacity duration-200",
            "group-data-[state=collapsed]/sidebar:opacity-0 group-data-[state=collapsed]/sidebar:w-0",
            "group-data-[state=expanded]/sidebar:opacity-100 group-data-[state=expanded]/sidebar:w-auto"
          )}
        >
          {children}
        </span>
      </Comp>
    </li>
  )

  if (expanded) return inner

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger render={<div />}>
          {inner}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="right" sideOffset={8}>
            <Tooltip.Popup className="rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md">
              {children}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

// ---------------------------------------------------------------------------
// SidebarSeparator
// ---------------------------------------------------------------------------

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      className={cn("mx-2 my-1", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarFooter
// ---------------------------------------------------------------------------

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex shrink-0 items-center px-2 py-2", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarPinToggle
// ---------------------------------------------------------------------------

function SidebarPinToggle({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { pinned, togglePinned, expanded } = useSidebar()

  return (
    <button
      data-slot="sidebar-pin-toggle"
      type="button"
      onClick={togglePinned}
      aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    >
      <HugeiconsIcon
        icon={pinned ? PinOffIcon : Pin02Icon}
        className="size-4"
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// SidebarInset
// ---------------------------------------------------------------------------

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("flex-1 overflow-auto", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarPinToggle,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
}
