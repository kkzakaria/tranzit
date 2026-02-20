import { getLocale } from "next-intl/server";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale: string;
  try {
    locale = await getLocale();
  } catch (err) {
    console.error("[RootLayout] getLocale() failed, falling back to default locale:", err);
    locale = "fr";
  }
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
