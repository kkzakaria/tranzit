"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const SIDEBAR_PINNED_KEY = "sidebar-pinned"

interface SidebarContextValue {
  pinned: boolean
  hovered: boolean
  expanded: boolean
  mobileOpen: boolean
  setPinned: (pinned: boolean) => void
  togglePinned: () => void
  setHovered: (hovered: boolean) => void
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export { SidebarContext, SIDEBAR_PINNED_KEY, useSidebar }
export type { SidebarContextValue }
