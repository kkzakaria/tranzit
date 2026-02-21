"use client"

import { FileExplorer } from "@/components/file-explorer"

import { FileExplorerView } from "./_file-explorer-view"

export function FileExplorerPage({ projectId }: { projectId: string }) {
  return (
    // h-[calc(100vh-3rem)] = full viewport minus AppBar height (pt-12 = 3rem on layout)
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <FileExplorer projectId={projectId} className="flex-1">
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
