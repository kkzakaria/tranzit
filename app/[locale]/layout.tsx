import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/sidebar";
import {
  ThemeProvider,
  AppBar,
  AppBarLogo,
  AppBarActions,
  ThemeToggle,
  NotificationButton,
  AppBarAvatar,
} from "@/components/app-bar";
import { LanguageSwitcher } from "@/components/language-switcher";

const nunitoSans = Nunito_Sans({ variable: "--font-sans", subsets: ["latin"] });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tranzit",
  description: "Tranzit application",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const messagesPromise = getMessages();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await messagesPromise;

  return (
    <NextIntlClientProvider messages={messages}>
      <div
        className={`${nunitoSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased pt-12`}
      >
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
      </div>
    </NextIntlClientProvider>
  );
}
