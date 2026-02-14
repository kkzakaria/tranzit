import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";

import { AppSidebar } from "@/components/app-sidebar";
import {
  ThemeProvider,
  AppBar,
  AppBarLogo,
  AppBarActions,
  ThemeToggle,
  NotificationButton,
  AppBarAvatar,
} from "@/components/app-bar";

const nunitoSans = Nunito_Sans({ variable: "--font-sans", subsets: ["latin"] });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tranzit",
  description: "Tranzit application",
};

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
