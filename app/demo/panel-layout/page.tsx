"use client"

import { useState } from "react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { usePanelLayout } from "@/hooks/use-panel-layout"
import {
  PanelLayout,
  PanelLeft,
  PanelResizer,
  PanelRight,
} from "@/components/panel-layout"

interface Item {
  id: number
  title: string
  description: string
}

const items: Item[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
  description: `Description for item ${i + 1} — click to see details.`,
}))

function ListPanel({
  selectedId,
  onSelect,
}: {
  selectedId: number | null
  onSelect: (item: Item) => void
}) {
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
            onClick={() => {
              onSelect(item)
              showDetail()
            }}
            className={cn(
              "w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              selectedId === item.id && "bg-primary/10"
            )}
          >
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-muted-foreground">{item.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DetailPanel({ item }: { item: Item | null }) {
  const { showList, isMobile } = usePanelLayout()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {isMobile && (
          <button
            type="button"
            onClick={showList}
            className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Retour"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold">
          {item ? item.title : "Detail"}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {item ? (
          <div className="space-y-4">
            <p>{item.description}</p>
            <p className="text-muted-foreground">Item ID: {item.id}</p>
            {Array.from({ length: 30 }, (_, i) => (
              <p key={i}>
                Paragraph {i + 1} — Lorem ipsum dolor sit amet, consectetur
                adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo
                consequat.
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Select an item from the list to view details.
          </p>
        )}
      </div>
    </div>
  )
}

export default function PanelLayoutDemoPage() {
  const [selected, setSelected] = useState<Item | null>(null)

  return (
    <div className="h-full">
      <PanelLayout>
        <PanelLeft>
          <ListPanel selectedId={selected?.id ?? null} onSelect={setSelected} />
        </PanelLeft>
        <PanelResizer />
        <PanelRight>
          <DetailPanel item={selected} />
        </PanelRight>
      </PanelLayout>
    </div>
  )
}
