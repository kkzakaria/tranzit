// Documentation & usage examples: ./file-explorer.md

"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  Edit01Icon,
  File01Icon,
  Folder01Icon,
  GridViewIcon,
  ImageIcon,
  LeftToRightListBulletIcon,
  More03Icon,
  UploadIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import {
  FileExplorerContext,
  useFileExplorer,
  useFileExplorerState,
  type FileItem,
} from "@/hooks/use-file-explorer"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getFileIcon(item: FileItem) {
  if (item.type === "folder") return Folder01Icon
  if (item.mimeType?.startsWith("image/")) return ImageIcon
  return File01Icon
}

// ---------------------------------------------------------------------------
// FileExplorer.Preview
// ---------------------------------------------------------------------------

function FileExplorerPreview({ file }: { file: FileItem }) {
  const t = useTranslations("file-explorer")

  const content = (() => {
    if (file.type === "folder") return null

    if (file.mimeType?.startsWith("image/")) {
      return (
        <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {/* Replace with the real preview URL from your backend */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/projects/preview?id=${file.id}`}
            alt={file.name}
            className="max-h-64 w-full object-contain"
          />
        </div>
      )
    }

    if (file.mimeType === "application/pdf") {
      return (
        <iframe
          src={`/api/projects/preview?id=${file.id}`}
          className="h-64 w-full rounded-lg border"
          title={file.name}
        />
      )
    }

    return (
      <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
        <HugeiconsIcon icon={File01Icon} className="size-12 opacity-40" />
        <p className="text-center text-xs">{t("detail.noPreview")}</p>
      </div>
    )
  })()

  return (
    <div className="flex flex-col gap-4" data-slot="file-explorer-preview">
      {content}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {file.size !== undefined && (
          <>
            <dt className="font-medium text-muted-foreground">
              {t("detail.size")}
            </dt>
            <dd>{formatBytes(file.size)}</dd>
          </>
        )}
        {file.mimeType && (
          <>
            <dt className="font-medium text-muted-foreground">
              {t("detail.type")}
            </dt>
            <dd className="truncate">{file.mimeType}</dd>
          </>
        )}
        <dt className="font-medium text-muted-foreground">
          {t("detail.modified")}
        </dt>
        <dd>{formatDate(file.modifiedAt)}</dd>
        <dt className="font-medium text-muted-foreground">
          {t("detail.path")}
        </dt>
        <dd className="truncate font-mono text-[0.65rem]">{file.path}</dd>
      </dl>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileExplorer.Sheet
// ---------------------------------------------------------------------------

function FileExplorerSheet() {
  const t = useTranslations("file-explorer")
  const { selectedFile, selectFile, deleteFile } = useFileExplorer()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!selectedFile) return
    await deleteFile(selectedFile.id)
    setDeleteOpen(false)
  }, [selectedFile, deleteFile])

  return (
    <>
      <Sheet
        open={selectedFile !== null}
        onOpenChange={(open) => {
          if (!open) selectFile(null)
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedFile?.name ?? ""}</SheetTitle>
            <div className="flex shrink-0 items-center gap-1">
              {selectedFile && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("actions.download")}
                    render={
                      <a
                        href={`/api/projects/preview?id=${selectedFile.id}`}
                        download={selectedFile.name}
                      />
                    }
                  >
                    <HugeiconsIcon icon={Download01Icon} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("actions.delete")}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} />
                  </Button>
                </>
              )}
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Fermer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} />
                  </Button>
                }
              />
            </div>
          </SheetHeader>
          <SheetBody>
            {selectedFile && <FileExplorerPreview file={selectedFile} />}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              {t("delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export {}
