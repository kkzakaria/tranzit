# i18n (next-intl) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter l'internationalisation au projet Tranzit via next-intl, avec 4 langues (fr, en, ar RTL, zh), routing par préfixe de locale, et un sélecteur de langue dans l'AppBar.

**Architecture:** next-intl avec middleware Next.js + segment dynamique `[locale]` dans l'App Router. La root layout (`app/layout.tsx`) reste minimale et lit la locale via `getLocale()` pour appliquer `lang` et `dir` sur `<html>`. Le layout de locale (`app/[locale]/layout.tsx`) fournit `NextIntlClientProvider` et tous les providers applicatifs. Les messages sont organisés en dossiers par locale, avec un fichier JSON par namespace.

**Tech Stack:** `next-intl` v4+, Next.js 16 App Router, TypeScript, bun

---

### Task 1 : Installer next-intl

**Files:**
- Modify: `package.json` (via bun add)
- Modify: `next.config.ts`

**Step 1 : Installer la dépendance**

```bash
bun add next-intl
```

**Step 2 : Mettre à jour next.config.ts**

Remplacer le contenu de `next.config.ts` par :

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: [
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
    ],
  },
};

export default withNextIntl(nextConfig);
```

**Step 3 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : erreurs liées aux fichiers manquants (i18n/request.ts) — c'est normal, on les créera dans les prochaines tâches.

**Step 4 : Commit**

```bash
git add next.config.ts package.json bun.lock
git commit -m "Add next-intl dependency and plugin config"
```

---

### Task 2 : Créer la configuration de routing i18n

**Files:**
- Create: `i18n/routing.ts`

**Step 1 : Créer `i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "ar", "zh"],
  defaultLocale: "fr",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : toujours des erreurs (i18n/request.ts manquant) — normal.

**Step 3 : Commit**

```bash
git add i18n/routing.ts
git commit -m "Add next-intl routing config with fr/en/ar/zh locales"
```

---

### Task 3 : Créer getRequestConfig (chargement des messages)

**Files:**
- Create: `i18n/request.ts`

**Step 1 : Créer `i18n/request.ts`**

```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const [common, navigation, appbar] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default),
    import(`../messages/${locale}/navigation.json`).then((m) => m.default),
    import(`../messages/${locale}/appbar.json`).then((m) => m.default),
  ]);

  return {
    locale,
    messages: { common, navigation, appbar },
  };
});
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : erreurs sur les fichiers messages manquants — normal, on les crée à la tâche 5.

**Step 3 : Commit**

```bash
git add i18n/request.ts
git commit -m "Add next-intl getRequestConfig with multi-namespace message loading"
```

---

### Task 4 : Créer les utilitaires de navigation locale-aware

**Files:**
- Create: `lib/navigation.ts`

**Step 1 : Créer `lib/navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

**Step 3 : Commit**

```bash
git add lib/navigation.ts
git commit -m "Add locale-aware navigation utilities via next-intl createNavigation"
```

---

### Task 5 : Créer le middleware de détection de locale

**Files:**
- Create: `middleware.ts` (racine du projet)

**Step 1 : Créer `middleware.ts`**

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - _next (Next.js internals)
    // - _vercel (Vercel internals)
    // - All files with an extension (e.g. favicon.ico)
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

**Step 3 : Commit**

```bash
git add middleware.ts
git commit -m "Add next-intl middleware for locale detection and URL prefix routing"
```

---

### Task 6 : Créer les fichiers de messages (4 langues × 3 namespaces)

**Files:**
- Create: `messages/fr/common.json`
- Create: `messages/fr/navigation.json`
- Create: `messages/fr/appbar.json`
- Create: `messages/en/common.json`
- Create: `messages/en/navigation.json`
- Create: `messages/en/appbar.json`
- Create: `messages/ar/common.json`
- Create: `messages/ar/navigation.json`
- Create: `messages/ar/appbar.json`
- Create: `messages/zh/common.json`
- Create: `messages/zh/navigation.json`
- Create: `messages/zh/appbar.json`

**Step 1 : Créer les messages français**

`messages/fr/common.json` :
```json
{
  "profile": "Profil",
  "settings": "Paramètres",
  "signOut": "Se déconnecter"
}
```

`messages/fr/navigation.json` :
```json
{
  "home": "Accueil",
  "dashboard": "Tableau de bord",
  "projects": "Projets",
  "panelLayout": "Mise en page panneau",
  "account": "Compte",
  "profile": "Profil",
  "settings": "Paramètres"
}
```

`messages/fr/appbar.json` :
```json
{
  "switchToDark": "Passer en mode sombre",
  "switchToLight": "Passer en mode clair",
  "notifications": "Notifications",
  "notificationsCount": "{count} notifications non lues",
  "userMenu": "Menu utilisateur",
  "changeLanguage": "Changer la langue"
}
```

**Step 2 : Créer les messages anglais**

`messages/en/common.json` :
```json
{
  "profile": "Profile",
  "settings": "Settings",
  "signOut": "Sign out"
}
```

`messages/en/navigation.json` :
```json
{
  "home": "Home",
  "dashboard": "Dashboard",
  "projects": "Projects",
  "panelLayout": "Panel Layout",
  "account": "Account",
  "profile": "Profile",
  "settings": "Settings"
}
```

`messages/en/appbar.json` :
```json
{
  "switchToDark": "Switch to dark mode",
  "switchToLight": "Switch to light mode",
  "notifications": "Notifications",
  "notificationsCount": "{count} unread notifications",
  "userMenu": "User menu",
  "changeLanguage": "Change language"
}
```

**Step 3 : Créer les messages arabes**

`messages/ar/common.json` :
```json
{
  "profile": "الملف الشخصي",
  "settings": "الإعدادات",
  "signOut": "تسجيل الخروج"
}
```

`messages/ar/navigation.json` :
```json
{
  "home": "الرئيسية",
  "dashboard": "لوحة التحكم",
  "projects": "المشاريع",
  "panelLayout": "تخطيط اللوحة",
  "account": "الحساب",
  "profile": "الملف الشخصي",
  "settings": "الإعدادات"
}
```

`messages/ar/appbar.json` :
```json
{
  "switchToDark": "التبديل إلى الوضع الداكن",
  "switchToLight": "التبديل إلى الوضع الفاتح",
  "notifications": "الإشعارات",
  "notificationsCount": "{count} إشعارات غير مقروءة",
  "userMenu": "قائمة المستخدم",
  "changeLanguage": "تغيير اللغة"
}
```

**Step 4 : Créer les messages chinois**

`messages/zh/common.json` :
```json
{
  "profile": "个人资料",
  "settings": "设置",
  "signOut": "退出登录"
}
```

`messages/zh/navigation.json` :
```json
{
  "home": "首页",
  "dashboard": "仪表板",
  "projects": "项目",
  "panelLayout": "面板布局",
  "account": "账户",
  "profile": "个人资料",
  "settings": "设置"
}
```

`messages/zh/appbar.json` :
```json
{
  "switchToDark": "切换到深色模式",
  "switchToLight": "切换到浅色模式",
  "notifications": "通知",
  "notificationsCount": "{count} 条未读通知",
  "userMenu": "用户菜单",
  "changeLanguage": "切换语言"
}
```

**Step 5 : Vérifier les types (les imports dynamiques dans request.ts doivent se résoudre)**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur.

**Step 6 : Commit**

```bash
git add messages/
git commit -m "Add translation messages for fr/en/ar/zh with common/navigation/appbar namespaces"
```

---

### Task 7 : Restructurer app/ — Root layout minimal

**Files:**
- Modify: `app/layout.tsx`

**Contexte :** Next.js exige un root layout avec `<html>` et `<body>`. On le garde minimal et on utilise `getLocale()` de next-intl pour appliquer `lang` et `dir` sur l'élément html. Les polices et les providers applicatifs sont déplacés dans le layout de locale (Task 8).

**Step 1 : Remplacer le contenu de `app/layout.tsx`**

```tsx
import { getLocale } from "next-intl/server";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
```

Note : `suppressHydrationWarning` est nécessaire car le thème (dark/light) est appliqué côté client sur `document.documentElement`.

**Step 2 : Vérifier que le build compile**

```bash
bun run build
```

Résultat attendu : build réussi (les pages root `/` n'existent plus mais la route `[locale]` n'est pas encore créée — des erreurs peuvent apparaître, c'est normal à cette étape).

**Step 3 : Commit**

```bash
git add app/layout.tsx
git commit -m "Simplify root layout: use getLocale() for lang/dir, move providers to locale layout"
```

---

### Task 8 : Créer app/[locale]/layout.tsx (layout principal)

**Files:**
- Create: `app/[locale]/layout.tsx`

**Contexte :** Ce layout remplace l'ancien `app/layout.tsx` comme layout "applicatif" principal. Il reçoit la locale en tant que paramètre de route, valide qu'elle est supportée, charge les messages, et fournit tous les providers (NextIntlClientProvider, ThemeProvider, SidebarProvider).

**Step 1 : Créer `app/[locale]/layout.tsx`**

```tsx
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
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

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
```

Note : Le `LanguageSwitcher` sera ajouté dans les `AppBarActions` à la Task 15, après la création du composant.

**Step 2 : Vérifier le build**

```bash
bun run build
```

Résultat attendu : erreur sur les pages manquantes — normal, on crée `[locale]/page.tsx` à la tâche suivante.

**Step 3 : Commit**

```bash
git add app/[locale]/layout.tsx
git commit -m "Add [locale] layout with NextIntlClientProvider, ThemeProvider, and SidebarProvider"
```

---

### Task 9 : Déplacer app/page.tsx → app/[locale]/page.tsx

**Files:**
- Create: `app/[locale]/page.tsx` (copie de `app/page.tsx`)
- Delete: `app/page.tsx`

**Step 1 : Créer `app/[locale]/page.tsx`**

Copier le contenu de `app/page.tsx` tel quel :

```tsx
import { ComponentExample } from "@/components/component-example";

export default function Page() {
  return <ComponentExample />;
}
```

**Step 2 : Supprimer `app/page.tsx`**

```bash
rm app/page.tsx
```

**Step 3 : Vérifier le build**

```bash
bun run build
```

Résultat attendu : build réussi avec la route `/[locale]` fonctionnelle.

**Step 4 : Commit**

```bash
git add app/[locale]/page.tsx
git rm app/page.tsx
git commit -m "Move home page under [locale] segment for i18n routing"
```

---

### Task 10 : Déplacer app/demo/ → app/[locale]/demo/

**Files:**
- Create: `app/[locale]/demo/panel-layout/page.tsx`
- Delete: `app/demo/panel-layout/page.tsx`

**Step 1 : Créer les dossiers nécessaires**

```bash
mkdir -p app/\[locale\]/demo/panel-layout
```

**Step 2 : Copier `app/demo/panel-layout/page.tsx` vers `app/[locale]/demo/panel-layout/page.tsx`**

Copier le fichier sans modifications — le contenu reste identique.

**Step 3 : Supprimer l'ancien fichier et le dossier**

```bash
git rm app/demo/panel-layout/page.tsx
```

**Step 4 : Vérifier le build**

```bash
bun run build
```

Résultat attendu : build réussi, route `/[locale]/demo/panel-layout` accessible.

**Step 5 : Commit**

```bash
git add app/[locale]/demo/
git rm -r app/demo/
git commit -m "Move demo pages under [locale] segment"
```

---

### Task 11 : Mettre à jour sidebar.tsx — Link locale-aware

**Files:**
- Modify: `components/sidebar.tsx:12`

**Contexte :** `SidebarItem` utilise `Link` de `next/link` qui génère des URLs sans préfixe de locale. On remplace par le `Link` de `@/lib/navigation` (créé en Task 4) qui préfixe automatiquement la locale courante.

**Step 1 : Remplacer l'import dans `components/sidebar.tsx`**

Trouver (ligne 12) :
```ts
import Link from "next/link"
```

Remplacer par :
```ts
import { Link } from "@/lib/navigation"
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur. L'API du `Link` de next-intl est identique à celle de next/link.

**Step 3 : Vérifier le build**

```bash
bun run build
```

**Step 4 : Commit**

```bash
git add components/sidebar.tsx
git commit -m "Use locale-aware Link in SidebarItem for correct prefixed navigation"
```

---

### Task 12 : Traduire app-sidebar.tsx

**Files:**
- Modify: `components/app-sidebar.tsx`

**Contexte :** Remplacer les textes hardcodés des items de navigation par des clés de traduction. Remplacer `usePathname` de `next/navigation` par celui de `@/lib/navigation` — il renvoie le pathname SANS préfixe de locale, donc les comparaisons `pathname === "/"` restent valides.

**Step 1 : Remplacer le contenu de `components/app-sidebar.tsx`**

```tsx
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
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

**Step 3 : Vérifier le build**

```bash
bun run build
```

**Step 4 : Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "Translate sidebar navigation labels using next-intl useTranslations"
```

---

### Task 13 : Traduire app-bar.tsx

**Files:**
- Modify: `components/app-bar.tsx`

**Contexte :** Remplacer les aria-labels et textes de menu hardcodés par des clés de traduction dans `ThemeToggle`, `NotificationButton`, et `AppBarAvatar`. Ces trois composants sont des Client Components (`"use client"`), on utilise `useTranslations`.

**Step 1 : Ajouter l'import next-intl dans `components/app-bar.tsx`**

Après les imports existants, ajouter :
```ts
import { useTranslations } from "next-intl"
```

**Step 2 : Mettre à jour `ThemeToggle`**

Trouver :
```tsx
function ThemeToggle({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { theme, toggleTheme } = React.useContext(ThemeContext) ?? { theme: "light" as Theme, toggleTheme: () => {} }

  return (
    <Button
      data-slot="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
```

Remplacer par :
```tsx
function ThemeToggle({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { theme, toggleTheme } = React.useContext(ThemeContext) ?? { theme: "light" as Theme, toggleTheme: () => {} }
  const t = useTranslations("appbar")

  return (
    <Button
      data-slot="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "light" ? t("switchToDark") : t("switchToLight")}
```

**Step 3 : Mettre à jour `NotificationButton`**

Trouver :
```tsx
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
```

Remplacer par :
```tsx
function NotificationButton({
  count,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { count?: number }) {
  const displayCount = count && count > 99 ? "99+" : count
  const t = useTranslations("appbar")

  return (
    <Button
      data-slot="notification-button"
      variant="ghost"
      size="icon"
      aria-label={
        count
          ? t("notificationsCount", { count })
          : t("notifications")
      }
```

**Step 4 : Mettre à jour `AppBarAvatar`**

Dans la fonction `AppBarAvatar`, ajouter `useTranslations` et remplacer les textes :

Ajouter en début de fonction (avant le calcul de `initials`) :
```ts
const t = useTranslations("appbar")
const tc = useTranslations("common")
```

Remplacer `aria-label="User menu"` par `aria-label={t("userMenu")}`.

Remplacer les textes des `DropdownMenuItem` :
```tsx
// "Profile" → {tc("profile")}
// "Settings" → {tc("settings")}
// "Sign out" → {tc("signOut")}
```

Soit le bloc complet des DropdownMenuItems :
```tsx
<DropdownMenuItem>
  <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
  {tc("profile")}
</DropdownMenuItem>
<DropdownMenuItem>
  <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
  {tc("settings")}
</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem variant="destructive">
  <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
  {tc("signOut")}
</DropdownMenuItem>
```

**Step 5 : Vérifier les types**

```bash
npx tsc --noEmit
```

**Step 6 : Vérifier le build**

```bash
bun run build
```

**Step 7 : Commit**

```bash
git add components/app-bar.tsx
git commit -m "Translate AppBar aria-labels and menu items using next-intl"
```

---

### Task 14 : Créer le composant LanguageSwitcher

**Files:**
- Create: `components/language-switcher.tsx`

**Step 1 : Créer `components/language-switcher.tsx`**

```tsx
"use client"

import { useLocale, useTranslations } from "next-intl"
import { Globe02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { routing } from "@/i18n/routing"
import { usePathname, useRouter } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LOCALE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  zh: "中文",
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("appbar")

  function handleChange(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="language-switcher"
          variant="ghost"
          size="icon"
          aria-label={t("changeLanguage")}
          className="motion-reduce:transition-none"
        >
          <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuGroup>
          {routing.locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onSelect={() => handleChange(loc)}
              aria-current={loc === locale ? "true" : undefined}
              className={loc === locale ? "font-semibold" : undefined}
            >
              {LOCALE_LABELS[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 2 : Vérifier les types**

```bash
npx tsc --noEmit
```

**Step 3 : Vérifier le build**

```bash
bun run build
```

**Step 4 : Commit**

```bash
git add components/language-switcher.tsx
git commit -m "Add LanguageSwitcher component with Globe icon and locale dropdown"
```

---

### Task 15 : Intégrer LanguageSwitcher dans le layout de locale

**Files:**
- Modify: `app/[locale]/layout.tsx`

**Step 1 : Ajouter l'import dans `app/[locale]/layout.tsx`**

Après les imports existants, ajouter :
```tsx
import { LanguageSwitcher } from "@/components/language-switcher"
```

**Step 2 : Ajouter `<LanguageSwitcher />` dans `AppBarActions`**

Trouver :
```tsx
<AppBarActions>
  <ThemeToggle />
  <NotificationButton count={3} />
  <AppBarAvatar
    name="Zakaria K."
    email="zakaria@tranzit.app"
  />
</AppBarActions>
```

Remplacer par :
```tsx
<AppBarActions>
  <LanguageSwitcher />
  <ThemeToggle />
  <NotificationButton count={3} />
  <AppBarAvatar
    name="Zakaria K."
    email="zakaria@tranzit.app"
  />
</AppBarActions>
```

**Step 3 : Vérifier les types**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur.

**Step 4 : Vérifier le build complet**

```bash
bun run build
```

Résultat attendu : build réussi sans erreurs.

**Step 5 : Vérifier le lint**

```bash
bun run lint
```

Résultat attendu : 0 erreur.

**Step 6 : Commit**

```bash
git add app/[locale]/layout.tsx
git commit -m "Add LanguageSwitcher to AppBar actions"
```

---

### Task 16 : Vérification finale

**Step 1 : Build de production**

```bash
bun run build
```

Résultat attendu : build réussi, toutes les routes localisées générées (`/fr`, `/en`, `/ar`, `/zh`, `/fr/demo/panel-layout`, etc.)

**Step 2 : Démarrer le serveur de dev et tester manuellement**

```bash
bun run dev
```

Vérifier dans le navigateur (http://localhost:34000) :
- [ ] Redirection automatique `/` → `/fr/` (ou locale navigateur)
- [ ] Textes de la sidebar en français
- [ ] LanguageSwitcher visible dans l'AppBar
- [ ] Clic sur "English" → redirect vers `/en/`, textes en anglais
- [ ] Clic sur "العربية" → redirect vers `/ar/`, attribut `dir="rtl"` sur `<html>`, textes en arabe
- [ ] Clic sur "中文" → redirect vers `/zh/`, textes en chinois
- [ ] Navigation sidebar fonctionne (URLs préfixées par locale)
- [ ] Rechargement de page conserve la langue

**Step 3 : Vérifier les attributs HTML en arabe**

Avec les DevTools, vérifier que l'élément `<html>` a `lang="ar"` et `dir="rtl"` quand la locale est `ar`.

**Step 4 : Commit final si tout est correct**

```bash
git add -A
git commit -m "Complete i18n implementation: next-intl with fr/en/ar/zh, RTL support, LanguageSwitcher"
```
