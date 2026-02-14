"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  SunIcon,
  MoonIcon,
  NotificationIcon,
  UserIcon,
  Settings01Icon,
  LogoutIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  ThemeContext,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemeContextValue,
} from "@/hooks/use-theme"

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")

  // Hydrate from localStorage + system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === "dark" || stored === "light") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setThemeState(stored)
        document.documentElement.classList.toggle("dark", stored === "dark")
        return
      }
    } catch {}

    // Fallback: system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (prefersDark) {
      setThemeState("dark")
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light"
      document.documentElement.classList.toggle("dark", next === "dark")
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  )

  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  )
}

// ---------------------------------------------------------------------------
// AppBar
// ---------------------------------------------------------------------------

function AppBar({
  className,
  children,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="app-bar"
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background px-4",
        className
      )}
      {...props}
    >
      {children}
    </header>
  )
}

// ---------------------------------------------------------------------------
// AppBarLogo
// ---------------------------------------------------------------------------

function AppBarLogo({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-bar-logo"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-foreground"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          T
        </span>
        <span className="hidden text-sm md:inline">Tranzit</span>
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppBarActions
// ---------------------------------------------------------------------------

function AppBarActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-bar-actions"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// ThemeToggle
// ---------------------------------------------------------------------------

function ThemeToggle({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { theme, toggleTheme } = React.useContext(ThemeContext) ?? { theme: "light" as Theme, toggleTheme: () => {} }

  return (
    <Button
      data-slot="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn("motion-reduce:transition-none", className)}
      {...props}
    >
      <HugeiconsIcon
        icon={theme === "light" ? SunIcon : MoonIcon}
        strokeWidth={2}
      />
    </Button>
  )
}

// ---------------------------------------------------------------------------
// NotificationButton
// ---------------------------------------------------------------------------

function NotificationButton({
  count,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { count?: number }) {
  const displayCount = count && count > 99 ? "99+" : count

  return (
    <Button
      data-slot="notification-button"
      variant="ghost"
      size="icon"
      aria-label={
        count ? `${count} unread notifications` : "Notifications"
      }
      className={cn("relative motion-reduce:transition-none", className)}
      {...props}
    >
      <HugeiconsIcon icon={NotificationIcon} strokeWidth={2} />
      {count && count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 text-destructive-foreground">
          {displayCount}
        </span>
      ) : null}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// AppBarAvatar
// ---------------------------------------------------------------------------

function AppBarAvatar({
  src,
  name,
  email,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  src?: string
  name?: string
  email?: string
}) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div data-slot="app-bar-avatar" className={cn("ml-1", className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="User menu"
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={name ?? "User avatar"}
              className="size-full object-cover"
              width={32}
              height={32}
            />
          ) : (
            <span className="text-xs font-medium">{initials}</span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          {(name || email) && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col">
                {name && <span className="text-xs font-medium text-foreground">{name}</span>}
                {email && <span className="text-[11px] text-muted-foreground">{email}</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          )}
          <DropdownMenuItem>
            <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export {
  ThemeProvider,
  AppBar,
  AppBarLogo,
  AppBarActions,
  ThemeToggle,
  NotificationButton,
  AppBarAvatar,
}
