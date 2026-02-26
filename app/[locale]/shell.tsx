"use client"

import type { ReactNode } from "react"
import {
  ThemeProvider,
  AppBar,
  AppBarLogo,
  AppBarActions,
  ThemeToggle,
  NotificationButton,
  AppBarAvatar,
} from "@/components/app-bar"
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"

export function Shell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider defaultPinned={false}>
        <AppBar>
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <AppBarLogo />
          </div>
          <AppBarActions>
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationButton count={3} />
            <AppBarAvatar
              name="Zakaria K."
              email="zakaria@tranzit.app"
            />
          </AppBarActions>
        </AppBar>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}
