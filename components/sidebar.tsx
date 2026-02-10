"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Tooltip } from "@base-ui/react/tooltip"
import { Pin02Icon, PinOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  SidebarContext,
  SIDEBAR_PINNED_KEY,
  useSidebar,
} from "@/hooks/use-sidebar"
import type { SidebarContextValue } from "@/hooks/use-sidebar"

// ---------------------------------------------------------------------------
// SidebarProvider
// ---------------------------------------------------------------------------

function SidebarProvider({
  defaultPinned = false,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { defaultPinned?: boolean }) {
  const [pinned, setPinnedState] = useState(defaultPinned)
  const [hovered, setHovered] = useState(false)

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
    () => ({ pinned, hovered, expanded, setPinned, togglePinned, setHovered }),
    [pinned, hovered, expanded, setPinned, togglePinned]
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
    <div
      data-slot="sidebar-wrapper"
      className="shrink-0 transition-[width] duration-200 ease-linear"
      style={{ width: pinned ? expandedWidth : collapsedWidth }}
    >
      <aside
        role="navigation"
        aria-label="Main navigation"
        data-slot="sidebar"
        data-state={state}
        data-pinned={pinned ? "" : undefined}
        className={cn(
          "group/sidebar flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear",
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
  const { expanded } = useSidebar()

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
}
