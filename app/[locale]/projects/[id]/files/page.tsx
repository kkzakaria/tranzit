import { getTranslations } from "next-intl/server"

import { routing } from "@/i18n/routing"

import { FileExplorerPage } from "./_file-explorer-page"

type Locale = (typeof routing.locales)[number]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "file-explorer",
  })
  return { title: t("title") }
}

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  return <FileExplorerPage projectId={id} />
}
