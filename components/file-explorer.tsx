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

// ---------------------------------------------------------------------------
// Shared: sorted file list
// ---------------------------------------------------------------------------

function sortedFiles(files: FileItem[]) {
  return [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

// ---------------------------------------------------------------------------
// FileExplorer.Grid
// ---------------------------------------------------------------------------

function FileExplorerGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { files, isLoading, error } = useFileExplorer()
  const t = useTranslations("file-explorer")

  if (isLoading)
    return (
      <p className="p-8 text-center text-xs text-muted-foreground">
        {t("loading")}
      </p>
    )
  if (error)
    return (
      <p className="p-8 text-center text-xs text-destructive">
        {t("error")}: {error}
      </p>
    )
  if (files.length === 0)
    return (
      <p className="p-8 text-center text-xs text-muted-foreground">
        {t("empty")}
      </p>
    )

  return (
    <div
      data-slot="file-explorer-grid"
      className={cn(
        "grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
        className
      )}
      {...props}
    >
      {sortedFiles(files).map((file) => (
        <FileExplorerItem key={file.id} item={file} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileExplorer.List
// ---------------------------------------------------------------------------

function FileExplorerList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { files, isLoading, error, navigateTo, selectFile } =
    useFileExplorer()
  const t = useTranslations("file-explorer")

  if (isLoading)
    return (
      <p className="p-8 text-center text-xs text-muted-foreground">
        {t("loading")}
      </p>
    )
  if (error)
    return (
      <p className="p-8 text-center text-xs text-destructive">
        {t("error")}: {error}
      </p>
    )
  if (files.length === 0)
    return (
      <p className="p-8 text-center text-xs text-muted-foreground">
        {t("empty")}
      </p>
    )

  return (
    <div
      data-slot="file-explorer-list"
      className={cn("flex flex-col divide-y", className)}
      {...props}
    >
      {sortedFiles(files).map((file) => {
        const Icon = getFileIcon(file)
        return (
          <div
            key={file.id}
            role="button"
            tabIndex={0}
            className="flex cursor-pointer select-none items-center gap-3 px-3 py-2 text-xs hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            onClick={() => {
              if (file.type === "folder") navigateTo(file.path)
              else selectFile(file)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (file.type === "folder") navigateTo(file.path)
                else selectFile(file)
              }
            }}
          >
            <HugeiconsIcon
              icon={Icon}
              className={cn(
                "size-5 shrink-0",
                file.type === "folder"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            />
            <span className="flex-1 truncate">{file.name}</span>
            {file.size !== undefined && (
              <span className="shrink-0 text-muted-foreground">
                {formatBytes(file.size)}
              </span>
            )}
            <span className="hidden shrink-0 text-muted-foreground sm:block">
              {formatDate(file.modifiedAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileExplorer.DropZone
// ---------------------------------------------------------------------------

function FileExplorerDropZone({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { uploadFiles } = useFileExplorer()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) await uploadFiles(files)
    },
    [uploadFiles]
  )

  return (
    <div
      data-slot="file-explorer-dropzone"
      data-drag-over={isDragOver ? "" : undefined}
      className={cn(
        "relative flex-1 overflow-auto transition-colors motion-reduce:transition-none",
        isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileExplorer.Toolbar
// ---------------------------------------------------------------------------

function FileExplorerToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations("file-explorer")
  const {
    breadcrumbs,
    navigateTo,
    viewMode,
    setViewMode,
    isUploading,
    uploadFiles,
  } = useFileExplorer()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      data-slot="file-explorer-toolbar"
      className={cn(
        "flex shrink-0 items-center gap-2 overflow-hidden border-b px-4 py-2",
        className
      )}
      {...props}
    >
      {/* Breadcrumbs */}
      <nav
        aria-label="Fil d'Ariane"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-xs"
        style={{ scrollbarWidth: "none" }}
      >
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && (
              <span className="shrink-0 text-muted-foreground">/</span>
            )}
            <button
              className={cn(
                "shrink-0 rounded px-1 py-0.5 transition-colors motion-reduce:transition-none hover:bg-muted",
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => navigateTo(crumb.path)}
            >
              {index === 0 ? t("root") : crumb.name}
            </button>
          </React.Fragment>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        {isUploading && (
          <span className="animate-pulse text-xs text-muted-foreground motion-reduce:animate-none">
            {t("uploading")}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("viewGrid")}
          aria-pressed={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          className={cn(viewMode === "grid" && "bg-muted")}
        >
          <HugeiconsIcon icon={GridViewIcon} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("viewList")}
          aria-pressed={viewMode === "list"}
          onClick={() => setViewMode("list")}
          className={cn(viewMode === "list" && "bg-muted")}
        >
          <HugeiconsIcon icon={LeftToRightListBulletIcon} />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <HugeiconsIcon icon={UploadIcon} />
          <span className="hidden sm:inline">{t("upload")}</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) {
              await uploadFiles(files)
              e.target.value = ""
            }
          }}
        />
      </div>
    </div>
  )
}
