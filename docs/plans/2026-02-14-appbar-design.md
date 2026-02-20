# AppBar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a full-width fixed AppBar (48px) with logo, theme toggle, notification badge, and avatar dropdown menu.

**Architecture:** Compound component pattern matching sidebar.tsx conventions. Dedicated `useTheme` hook for theme persistence. AppBar sits above the existing SidebarProvider in layout.tsx. Uses existing `Button`, `DropdownMenu` primitives from `components/ui/`.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, @base-ui/react, @hugeicons/core-free-icons, class-variance-authority

**Skills to apply during implementation:**
- @vercel-react-best-practices — component composition, memoization, Server Component boundaries
- @web-design-guidelines — accessibility, spacing, responsive design, color contrast

---

### Task 1: Create useTheme hook

**Files:**
- Create: `hooks/use-theme.ts`

**Step 1: Create the hook file**

Follow the existing pattern from `hooks/use-sidebar.ts` — context + hook + constants.

```typescript
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
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/use-theme.ts
git commit -m "Add useTheme hook context and types"
```

---

### Task 2: Create AppBar compound component

**Files:**
- Create: `components/app-bar.tsx`
- Reference: `components/sidebar.tsx` (for compound component pattern)
- Reference: `components/ui/button.tsx` (for Button ghost variant)
- Reference: `components/ui/dropdown-menu.tsx` (for avatar menu)

**Step 1: Create the AppBar component file**

The file contains: `ThemeProvider`, `AppBar`, `AppBarLogo`, `AppBarActions`, `ThemeToggle`, `NotificationButton`, `AppBarAvatar`.

```typescript
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const { theme, toggleTheme } = React.useContext(ThemeContext) ?? { theme: "light", toggleTheme: () => {} }

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
            <>
              <DropdownMenuLabel className="flex flex-col">
                {name && <span className="text-xs font-medium text-foreground">{name}</span>}
                {email && <span className="text-[11px] text-muted-foreground">{email}</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
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
```

**Key patterns used:**
- `data-slot` on every sub-component (matches sidebar.tsx pattern)
- `cn()` for all className merging
- `"use client"` pragma at top
- Hydration-safe localStorage: `useState("light")` + `useEffect` post-mount
- `useMemo` for context value (prevents unnecessary re-renders — @vercel-react-best-practices)
- `useCallback` for toggleTheme (stable reference — @vercel-react-best-practices)
- `motion-reduce:transition-none` on animated elements (accessibility — @web-design-guidelines)
- `aria-label` on all icon-only buttons (accessibility — @web-design-guidelines)
- Ghost button variant for icon buttons (matches sidebar icon style)
- Existing `DropdownMenu` primitives for avatar menu (consistency)
- `next/link` for logo navigation (not `<a>`)

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/app-bar.tsx
git commit -m "Add AppBar compound component with theme, notifications, avatar"
```

---

### Task 3: Integrate AppBar into layout

**Files:**
- Modify: `app/layout.tsx` (lines 24-38)

**Step 1: Update layout.tsx**

Add `ThemeProvider` and `AppBar` above `AppSidebar`. Add `pt-12` wrapper for content offset.

Current layout.tsx (lines 24-38):
```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppSidebar>{children}</AppSidebar>
      </body>
    </html>
  );
}
```

Change to:
```typescript
import {
  ThemeProvider,
  AppBar,
  AppBarLogo,
  AppBarActions,
  ThemeToggle,
  NotificationButton,
  AppBarAvatar,
} from "@/components/app-bar"

// ... (existing code unchanged) ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AppBar>
            <AppBarLogo />
            <AppBarActions>
              <ThemeToggle />
              <NotificationButton count={3} />
              <AppBarAvatar name="Zakaria K." email="zakaria@tranzit.app" />
            </AppBarActions>
          </AppBar>
          <div className="pt-12">
            <AppSidebar>{children}</AppSidebar>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Important notes:**
- `ThemeProvider` wraps everything (including AppSidebar) so theme context is available app-wide
- `<div className="pt-12">` offsets content below the fixed AppBar
- `AppBar` uses `position: fixed` so it stays above scrolling content
- `layout.tsx` is a Server Component — but it renders `ThemeProvider` (client) and `AppSidebar` (client) as children, which is correct per React Server Component rules

**Step 2: Verify build compiles**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 3: Verify dev server renders correctly**

Run: `bun run dev`
Expected: AppBar visible at top, 48px height, logo left, actions right, sidebar below

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "Integrate AppBar into root layout above sidebar"
```

---

### Task 4: Adjust sidebar top position

**Files:**
- Modify: `components/sidebar.tsx` — the desktop sidebar `<aside>` needs `top-12` instead of `top-0` since the AppBar is now fixed above it
- Modify: `components/app-sidebar.tsx` — the mobile header trigger may need adjustment

**Step 1: Check if sidebar uses `top-0` or `inset-y-0`**

Read `components/sidebar.tsx` and find the `<aside>` element's className. It likely uses `top-0` or `inset-y-0` for positioning. Since the AppBar is now `fixed top-0 h-12`, the sidebar needs `top-12` and `h-[calc(100vh-3rem)]` (or `h-[calc(100dvh-3rem)]`).

**Step 2: Update sidebar positioning**

In `components/sidebar.tsx`, find the desktop `<aside>` element and change:
- `top-0` → `top-12`
- `h-dvh` or `h-screen` → `h-[calc(100dvh-3rem)]`

**Step 3: Remove redundant mobile header from app-sidebar.tsx**

In `components/app-sidebar.tsx`, the mobile hamburger header (lines 71-73) may overlap with the AppBar. Move `SidebarTrigger` into the AppBar for mobile, or keep it separate if the AppBar doesn't include a mobile menu trigger.

Since the AppBar is full-width and always visible, the mobile `<SidebarTrigger>` should move into `AppBarActions` (visible only on mobile via `md:hidden`).

**Step 4: Verify visual result**

Run: `bun run dev`
Expected: Sidebar starts below the AppBar, no overlap, mobile trigger works

**Step 5: Commit**

```bash
git add components/sidebar.tsx components/app-sidebar.tsx
git commit -m "Adjust sidebar positioning to account for AppBar height"
```

---

### Task 5: Lint and type check

**Files:**
- All modified files

**Step 1: Run linter**

Run: `bun run lint`
Expected: No errors (warnings about `set-state-in-effect` are expected and already suppressed with eslint-disable comments)

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run production build**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Fix any issues found**

If lint/type errors appear, fix them following existing patterns in the codebase.

**Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "Fix lint and type errors in AppBar"
```

---

### Task 6: Write documentation

**Files:**
- Create: `components/app-bar.md`

**Step 1: Create documentation file**

Follow the exact pattern from `components/sidebar.md` and `components/panel-layout.md`:

Document sections:
1. Description
2. Components table (name, element, data-slot, description)
3. Props table for each component
4. Hook API (`useTheme`)
5. Data attributes table
6. Code examples (basic usage, custom avatar, notification count)
7. Accessibility notes
8. Responsive behavior

**Step 2: Commit**

```bash
git add components/app-bar.md
git commit -m "Add AppBar component documentation"
```

---

### Task 7: Visual verification

**Step 1: Start dev server and verify**

Run: `bun run dev`

Verify checklist:
- [ ] AppBar is 48px tall, fixed at top
- [ ] Logo "T" icon + "Tranzit" text visible on desktop
- [ ] Logo text hidden on mobile (icon only)
- [ ] Theme toggle switches between light/dark
- [ ] Theme persists after page reload
- [ ] Notification badge shows count
- [ ] Avatar shows initials "ZK"
- [ ] Avatar dropdown opens with Profile, Settings, Sign out
- [ ] Sidebar starts below AppBar (no overlap)
- [ ] Mobile: sidebar trigger still works
- [ ] Focus rings visible on keyboard navigation
- [ ] No layout shift on page load (hydration-safe)
