import { getTranslations } from "next-intl/server"

import { FileExplorer } from "@/components/file-explorer"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "file-explorer" })
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
            <FileExplorer.Grid />
          </div>
        </FileExplorer.DropZone>
        <FileExplorer.Sheet />
      </FileExplorer>
    </div>
  )
}
