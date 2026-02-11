"use client"

import { createContext, useContext } from "react"

const MIN_WIDTH = 320
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 320
const STORAGE_KEY = "panel-layout-width"

interface PanelLayoutContextValue {
  leftWidth: number
  setLeftWidth: (w: number) => void
  isResizing: boolean
  setIsResizing: (v: boolean) => void
  activePanel: "left" | "right"
  setActivePanel: (p: "left" | "right") => void
  showDetail: () => void
  showList: () => void
  isMobile: boolean
}

const PanelLayoutContext = createContext<PanelLayoutContextValue | null>(null)

function usePanelLayout() {
  const context = useContext(PanelLayoutContext)
  if (!context) {
    throw new Error("usePanelLayout must be used within a PanelLayout")
  }
  return context
}

export { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, PanelLayoutContext, STORAGE_KEY, usePanelLayout }
export type { PanelLayoutContextValue }
