import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "ar", "zh"],
  defaultLocale: "fr",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
