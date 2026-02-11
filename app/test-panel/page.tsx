"use client"

import { usePanelLayout } from "@/hooks/use-panel-layout"
import {
  PanelLayout,
  PanelLeft,
  PanelResizer,
  PanelRight,
} from "@/components/panel-layout"

const items = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
  description: `Description for item ${i + 1} — click to see details.`,
}))

function ListPanel() {
  const { showDetail, activePanel, leftWidth, isMobile } = usePanelLayout()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">List</h2>
        <p className="text-sm text-muted-foreground">
          {isMobile ? "mobile" : "desktop"} · width: {leftWidth}px · active: {activePanel}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={showDetail}
            className="w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-muted-foreground">{item.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DetailPanel() {
  const { showList, isMobile } = usePanelLayout()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {isMobile && (
          <button
            type="button"
            onClick={showList}
            className="rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted"
          >
            &larr; Back
          </button>
        )}
        <h2 className="text-lg font-semibold">Detail</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-muted-foreground">
          Select an item from the list to view details.
        </p>
        <p className="mt-4 text-muted-foreground">
          On desktop, drag the resizer handle between the two panels to resize.
          On mobile, use the back button to return to the list.
        </p>
      </div>
    </div>
  )
}

export default function TestPanelPage() {
  return (
    <div className="h-[calc(100vh-48px)]">
      <PanelLayout>
        <PanelLeft className="border-r">
          <ListPanel />
        </PanelLeft>
        <PanelResizer />
        <PanelRight>
          <DetailPanel />
        </PanelRight>
      </PanelLayout>
    </div>
  )
}
