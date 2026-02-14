"use client"

import { usePathname } from "next/navigation"
import {
  Home01Icon,
  Folder01Icon,
  LayoutTwoColumnIcon,
  Settings01Icon,
  DashboardSquare01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarItem,
  SidebarPinToggle,
  SidebarSeparator,
} from "@/components/sidebar"

const activeItemClass = "data-[active]:bg-primary/10 data-[active]:text-primary data-[active]:font-semibold"

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarItem href="/" icon={Home01Icon} active={pathname === "/"} className={activeItemClass}>
              Home
            </SidebarItem>
            <SidebarItem href="/dashboard" icon={DashboardSquare01Icon} active={pathname === "/dashboard"} className={activeItemClass}>
              Dashboard
            </SidebarItem>
            <SidebarItem href="/projects" icon={Folder01Icon} active={pathname === "/projects"} className={activeItemClass}>
              Projects
            </SidebarItem>
            <SidebarItem href="/demo/panel-layout" icon={LayoutTwoColumnIcon} active={pathname === "/demo/panel-layout"} className={activeItemClass}>
              Panel Layout
            </SidebarItem>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItem href="/profile" icon={UserIcon} active={pathname === "/profile"} className={activeItemClass}>
              Profile
            </SidebarItem>
            <SidebarItem href="/settings" icon={Settings01Icon} active={pathname === "/settings"} className={activeItemClass}>
              Settings
            </SidebarItem>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarPinToggle />
      </SidebarFooter>
    </Sidebar>
  )
}
