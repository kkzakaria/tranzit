"use client"

import { createContext, useContext } from "react"

const THEME_STORAGE_KEY = "theme"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export { ThemeContext, THEME_STORAGE_KEY, useTheme }
export type { Theme, ThemeContextValue }
