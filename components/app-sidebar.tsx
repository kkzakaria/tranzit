"use client"

import {
  Home01Icon,
  Folder01Icon,
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
  SidebarInset,
  SidebarItem,
  SidebarPinToggle,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/sidebar"

const activeItemClass = "data-[active]:bg-primary/10 data-[active]:text-primary data-[active]:font-semibold"

export function AppSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultPinned={false}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarItem href="/" icon={Home01Icon} active className={activeItemClass}>
                Home
              </SidebarItem>
              <SidebarItem href="/dashboard" icon={DashboardSquare01Icon} className={activeItemClass}>
                Dashboard
              </SidebarItem>
              <SidebarItem href="/projects" icon={Folder01Icon} className={activeItemClass}>
                Projects
              </SidebarItem>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarItem href="/profile" icon={UserIcon} className={activeItemClass}>
                Profile
              </SidebarItem>
              <SidebarItem href="/settings" icon={Settings01Icon} className={activeItemClass}>
                Settings
              </SidebarItem>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarPinToggle />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
