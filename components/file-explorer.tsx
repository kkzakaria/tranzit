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


// ---------------------------------------------------------------------------
// FileExplorer.Item
// ---------------------------------------------------------------------------

function FileExplorerItem({ item }: { item: FileItem }) {
  const t = useTranslations("file-explorer")
  const { navigateTo, selectFile, renameFile, deleteFile } = useFileExplorer()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(item.name)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const Icon = getFileIcon(item)

  const handleActivate = useCallback(() => {
    if (item.type === "folder") {
      navigateTo(item.path)
    } else {
      selectFile(item)
    }
  }, [item, navigateTo, selectFile])

  const handleRenameStart = useCallback(() => {
    setRenameValue(item.name)
    setIsRenaming(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [item.name])

  const handleRenameCommit = useCallback(async () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== item.name) {
      await renameFile(item.id, trimmed)
    }
    setIsRenaming(false)
  }, [item.id, item.name, renameValue, renameFile])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleRenameCommit()
      if (e.key === "Escape") setIsRenaming(false)
    },
    [handleRenameCommit]
  )

  const handleDelete = useCallback(async () => {
    await deleteFile(item.id)
    setDeleteOpen(false)
  }, [item.id, deleteFile])

  return (
    <>
      <div
        data-slot="file-explorer-item"
        role="button"
        tabIndex={0}
        aria-label={item.name}
        className={cn(
          "group/item relative flex cursor-pointer select-none flex-col items-center gap-2 rounded-lg p-3 text-center",
          "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
          "transition-colors motion-reduce:transition-none"
        )}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleActivate()
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault()
          handleRenameStart()
        }}
      >
        <HugeiconsIcon
          icon={Icon}
          className={cn(
            "size-10 shrink-0",
            item.type === "folder"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        />

        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border bg-background px-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label={t("rename.label")}
          />
        ) : (
          <span className="w-full truncate text-xs leading-tight">
            {item.name}
          </span>
        )}

        {/* Context menu button */}
        <div
          className={cn(
            "absolute right-1 top-1",
            "opacity-0 transition-opacity motion-reduce:transition-none",
            "group-hover/item:opacity-100 group-focus-within/item:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Plus d'actions"
                >
                  <HugeiconsIcon icon={More03Icon} />
                </Button>
              }
            />
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuItem onSelect={handleRenameStart}>
                <HugeiconsIcon icon={Edit01Icon} />
                {t("actions.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const a = document.createElement("a")
                  a.href = `/api/projects/preview?id=${item.id}`
                  a.download = item.name
                  a.click()
                }}
              >
                <HugeiconsIcon icon={Download01Icon} />
                {t("actions.download")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} />
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
