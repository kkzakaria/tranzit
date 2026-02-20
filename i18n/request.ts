import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  let common, navigation, appbar;
  try {
    [common, navigation, appbar] = await Promise.all([
      import(`../messages/${locale}/common.json`).then((m) => m.default),
      import(`../messages/${locale}/navigation.json`).then((m) => m.default),
      import(`../messages/${locale}/appbar.json`).then((m) => m.default),
    ]);
  } catch (err) {
    console.error(
      `[i18n] Failed to load messages for locale "${locale}". ` +
        "Ensure common.json, navigation.json, and appbar.json exist and are valid JSON.",
      err
    );
    throw err;
  }

  return {
    locale,
    messages: { common, navigation, appbar },
  };
});
