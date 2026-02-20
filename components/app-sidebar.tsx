"use client"

import { useTranslations } from "next-intl"
import {
  Home01Icon,
  Folder01Icon,
  LayoutTwoColumnIcon,
  Settings01Icon,
  DashboardSquare01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"

import { usePathname } from "@/lib/navigation"
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

const activeItemClass =
  "data-[active]:bg-primary/10 data-[active]:text-primary data-[active]:font-semibold"

export function AppSidebar() {
  const pathname = usePathname()
  const t = useTranslations("navigation")

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarItem
              href="/"
              icon={Home01Icon}
              active={pathname === "/"}
              className={activeItemClass}
            >
              {t("home")}
            </SidebarItem>
            <SidebarItem
              href="/dashboard"
              icon={DashboardSquare01Icon}
              active={pathname === "/dashboard"}
              className={activeItemClass}
            >
              {t("dashboard")}
            </SidebarItem>
            <SidebarItem
              href="/projects"
              icon={Folder01Icon}
              active={pathname === "/projects"}
              className={activeItemClass}
            >
              {t("projects")}
            </SidebarItem>
            <SidebarItem
              href="/demo/panel-layout"
              icon={LayoutTwoColumnIcon}
              active={pathname === "/demo/panel-layout"}
              className={activeItemClass}
            >
              {t("panelLayout")}
            </SidebarItem>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>{t("account")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItem
              href="/profile"
              icon={UserIcon}
              active={pathname === "/profile"}
              className={activeItemClass}
            >
              {t("profile")}
            </SidebarItem>
            <SidebarItem
              href="/settings"
              icon={Settings01Icon}
              active={pathname === "/settings"}
              className={activeItemClass}
            >
              {t("settings")}
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
