"use client"

import { useFileExplorer } from "@/hooks/use-file-explorer"
import { FileExplorer } from "@/components/file-explorer"

export function FileExplorerView() {
  const { viewMode } = useFileExplorer()
  return viewMode === "list" ? <FileExplorer.List /> : <FileExplorer.Grid />
}
