import { getTranslations } from "next-intl/server"

import { routing } from "@/i18n/routing"
import { FileExplorer } from "@/components/file-explorer"

import { FileExplorerView } from "./_file-explorer-view"

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

  return (
    // h-[calc(100vh-3rem)] = full viewport minus AppBar height (pt-12 = 3rem on layout)
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <FileExplorer projectId={id} className="flex-1">
        <FileExplorer.Toolbar />
        <FileExplorer.DropZone>
          <div className="p-4">
            <FileExplorerView />
          </div>
        </FileExplorer.DropZone>
        <FileExplorer.Sheet />
      </FileExplorer>
    </div>
  )
}
