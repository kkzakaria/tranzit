"use client"

import { useLocale, useTranslations } from "next-intl"
import { Globe02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { routing } from "@/i18n/routing"
import type { Locale } from "@/i18n/routing"
import { usePathname, useRouter } from "@/lib/navigation"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LOCALE_LABELS: Record<Locale, string> = {
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

  function handleChange(nextLocale: Locale) {
    const result: unknown = router.replace(pathname, { locale: nextLocale })
    if (result instanceof Promise) {
      result.catch((err: unknown) => {
        console.error(
          `[LanguageSwitcher] Navigation failed when switching to locale "${nextLocale}":`,
          err
        )
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="language-switcher"
        aria-label={t("changeLanguage")}
        className={buttonVariants({ variant: "ghost", size: "icon", className: "motion-reduce:transition-none" })}
      >
        <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuGroup>
          {routing.locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleChange(loc)}
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
