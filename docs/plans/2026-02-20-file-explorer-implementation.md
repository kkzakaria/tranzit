# File Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-width project file explorer at `/projects/[id]/files` with grid/list view, file detail side sheet, drag-drop upload, and context menu file actions.

**Architecture:** Compound component (`FileExplorer`) with sub-components (Toolbar, DropZone, Grid, List, Item, Sheet, Preview), context-driven state in `use-file-explorer.ts`, data fetched client-side from a remote API. The sheet slides from the right using Base UI Dialog. No test framework exists — validation uses `npx tsc --noEmit` + `bun run lint`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Base UI v1.1 (`@base-ui/react`), Hugeicons (`@hugeicons/core-free-icons` + `@hugeicons/react`), next-intl (fr/en/ar/zh), bun

---

## Icon Reference (Hugeicons)

All from `@hugeicons/core-free-icons`:
- Folder: `Folder01Icon` (already used in app-sidebar)
- File (generic): `File01Icon`
- Image file: `ImageIcon`
- Grid view: `GridViewIcon`
- List view: `LeftToRightListBulletIcon`
- Upload: `UploadIcon`
- Download: `Download01Icon`
- Rename/Edit: `Edit01Icon`
- Delete: `Delete02Icon`
- Close/Cancel: `Cancel01Icon`
- Context menu: `More03Icon`

---

### Task 1: Types and hook

**Files:**
- Create: `hooks/use-file-explorer.ts`

**Step 1: Write the file**

```ts
"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  size?: number
  mimeType?: string
  modifiedAt: string
  path: string
}

export interface Breadcrumb {
  name: string
  path: string
}

export interface FileExplorerContextValue {
  projectId: string
  currentPath: string
  navigateTo: (path: string) => void
  breadcrumbs: Breadcrumb[]
  files: FileItem[]
  isLoading: boolean
  error: string | null
  selectedFile: FileItem | null
  selectFile: (file: FileItem | null) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  isUploading: boolean
  uploadProgress: number
  uploadFiles: (files: File[]) => Promise<void>
  renameFile: (id: string, name: string) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  moveFile: (id: string, targetPath: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const FileExplorerContext =
  React.createContext<FileExplorerContextValue | null>(null)

export function useFileExplorer() {
  const ctx = React.useContext(FileExplorerContext)
  if (!ctx)
    throw new Error("useFileExplorer must be used inside <FileExplorer>")
  return ctx
}

const VIEW_MODE_KEY = "file-explorer:view-mode"

// ---------------------------------------------------------------------------
// Hook (used by the root FileExplorer component)
// ---------------------------------------------------------------------------

export function useFileExplorerState(
  projectId: string
): FileExplorerContextValue {
  const [currentPath, setCurrentPath] = useState("/")
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [viewMode, setViewModeState] = useState<"grid" | "list">("grid")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Hydrate viewMode from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "grid" || stored === "list") setViewModeState(stored)
  }, [])

  const setViewMode = useCallback((mode: "grid" | "list") => {
    setViewModeState(mode)
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode)
    } catch {}
  }, [])

  const breadcrumbs = useMemo<Breadcrumb[]>(() => {
    const parts = currentPath.split("/").filter(Boolean)
    const crumbs: Breadcrumb[] = [{ name: "Racine", path: "/" }]
    parts.reduce((acc, part) => {
      const path = `${acc}/${part}`
      crumbs.push({ name: part, path })
      return path
    }, "")
    return crumbs
  }, [currentPath])

  // Fetch files whenever path changes
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetch(
      `/api/projects/${projectId}/files?path=${encodeURIComponent(currentPath)}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ items: FileItem[] }>
      })
      .then(({ items }) => {
        if (!cancelled) setFiles(items)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erreur inconnue")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, currentPath])

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
  }, [])

  const selectFile = useCallback((file: FileItem | null) => {
    setSelectedFile(file)
  }, [])

  const uploadFiles = useCallback(
    async (newFiles: File[]) => {
      setIsUploading(true)
      setUploadProgress(0)
      try {
        const formData = new FormData()
        newFiles.forEach((f) => formData.append("files", f))
        formData.append("path", currentPath)
        const res = await fetch(
          `/api/projects/${projectId}/files/upload`,
          { method: "POST", body: formData }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setUploadProgress(100)
        // Refresh file list
        const r = await fetch(
          `/api/projects/${projectId}/files?path=${encodeURIComponent(currentPath)}`
        )
        const { items } = (await r.json()) as { items: FileItem[] }
        setFiles(items)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [projectId, currentPath]
  )

  const renameFile = useCallback(
    async (id: string, name: string) => {
      await fetch(`/api/projects/${projectId}/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)))
      setSelectedFile((prev) =>
        prev?.id === id ? { ...prev, name } : prev
      )
    },
    [projectId]
  )

  const deleteFile = useCallback(
    async (id: string) => {
      await fetch(`/api/projects/${projectId}/files/${id}`, {
        method: "DELETE",
      })
      setFiles((prev) => prev.filter((f) => f.id !== id))
      setSelectedFile((prev) => (prev?.id === id ? null : prev))
    },
    [projectId]
  )

  const moveFile = useCallback(
    async (id: string, targetPath: string) => {
      await fetch(`/api/projects/${projectId}/files/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPath }),
      })
      setFiles((prev) => prev.filter((f) => f.id !== id))
    },
    [projectId]
  )

  return useMemo<FileExplorerContextValue>(
    () => ({
      projectId,
      currentPath,
      navigateTo,
      breadcrumbs,
      files,
      isLoading,
      error,
      selectedFile,
      selectFile,
      viewMode,
      setViewMode,
      isUploading,
      uploadProgress,
      uploadFiles,
      renameFile,
      deleteFile,
      moveFile,
    }),
    [
      projectId,
      currentPath,
      navigateTo,
      breadcrumbs,
      files,
      isLoading,
      error,
      selectedFile,
      selectFile,
      viewMode,
      setViewMode,
      isUploading,
      uploadProgress,
      uploadFiles,
      renameFile,
      deleteFile,
      moveFile,
    ]
  )
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Lint**

Run: `bun run lint`
Expected: no errors

**Step 4: Commit**

```bash
git add hooks/use-file-explorer.ts
git commit -m "feat: add use-file-explorer hook with types and context"
```

---

### Task 2: Mock API routes

**Files:**
- Create: `app/api/projects/[id]/files/route.ts`
- Create: `app/api/projects/[id]/files/upload/route.ts`
- Create: `app/api/projects/[id]/files/[fileId]/route.ts`
- Create: `app/api/projects/[id]/files/[fileId]/move/route.ts`

**Step 1: Write the list route**

`app/api/projects/[id]/files/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import type { FileItem } from "@/hooks/use-file-explorer"

const MOCK_FILES: FileItem[] = [
  {
    id: "1",
    name: "Documents",
    type: "folder",
    modifiedAt: "2026-02-15T10:00:00Z",
    path: "/Documents",
  },
  {
    id: "2",
    name: "Images",
    type: "folder",
    modifiedAt: "2026-02-14T08:30:00Z",
    path: "/Images",
  },
  {
    id: "3",
    name: "rapport-q1.pdf",
    type: "file",
    size: 245000,
    mimeType: "application/pdf",
    modifiedAt: "2026-02-18T14:22:00Z",
    path: "/rapport-q1.pdf",
  },
  {
    id: "4",
    name: "budget.xlsx",
    type: "file",
    size: 58000,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    modifiedAt: "2026-02-17T09:10:00Z",
    path: "/budget.xlsx",
  },
  {
    id: "5",
    name: "logo.png",
    type: "file",
    size: 12400,
    mimeType: "image/png",
    modifiedAt: "2026-02-10T16:45:00Z",
    path: "/logo.png",
  },
  {
    id: "6",
    name: "notes.txt",
    type: "file",
    size: 1200,
    mimeType: "text/plain",
    modifiedAt: "2026-02-19T11:00:00Z",
    path: "/notes.txt",
  },
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  return NextResponse.json({ items: MOCK_FILES })
}
```

**Step 2: Write upload route**

`app/api/projects/[id]/files/upload/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true })
}
```

**Step 3: Write rename/delete route**

`app/api/projects/[id]/files/[fileId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(_req: NextRequest) {
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest) {
  return NextResponse.json({ ok: true })
}
```

**Step 4: Write move route**

`app/api/projects/[id]/files/[fileId]/move/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true })
}
```

**Step 5: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 6: Commit**

```bash
git add app/api/projects/
git commit -m "feat: add mock API routes for file explorer"
```

---

### Task 3: Sheet UI component

**Files:**
- Create: `components/ui/sheet.tsx`

Wraps Base UI `Dialog` as a slide-in sheet from the right. Same pattern as `alert-dialog.tsx`.

**Step 1: Write the sheet**

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-200 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "bg-background fixed top-0 right-0 z-50 flex h-full w-full flex-col shadow-xl",
          "sm:w-[420px] sm:border-l",
          "data-open:animate-in data-closed:animate-out",
          "data-open:slide-in-from-right data-closed:slide-out-to-right",
          "duration-300 motion-reduce:transition-none",
          "overscroll-contain",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("truncate text-sm font-medium", className)}
      {...props}
    />
  )
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 overflow-y-auto p-4", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
}
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "feat: add Sheet UI component wrapping Base UI Dialog"
```

---

### Task 4: i18n keys

**Files:**
- Create: `messages/fr/file-explorer.json`
- Create: `messages/en/file-explorer.json`
- Create: `messages/ar/file-explorer.json`
- Create: `messages/zh/file-explorer.json`

**Step 1: Write FR**

`messages/fr/file-explorer.json`:
```json
{
  "title": "Fichiers",
  "upload": "Téléverser",
  "uploading": "Envoi en cours…",
  "viewGrid": "Vue grille",
  "viewList": "Vue liste",
  "root": "Racine",
  "empty": "Aucun fichier dans ce dossier",
  "loading": "Chargement…",
  "error": "Impossible de charger les fichiers",
  "actions": {
    "rename": "Renommer",
    "delete": "Supprimer",
    "download": "Télécharger",
    "move": "Déplacer"
  },
  "rename": {
    "label": "Nouveau nom"
  },
  "delete": {
    "title": "Supprimer ce fichier ?",
    "description": "Cette action est irréversible. Le fichier sera définitivement supprimé.",
    "confirm": "Supprimer",
    "cancel": "Annuler"
  },
  "detail": {
    "size": "Taille",
    "type": "Type",
    "modified": "Modifié le",
    "path": "Chemin",
    "noPreview": "Aperçu non disponible pour ce type de fichier"
  }
}
```

**Step 2: Write EN**

`messages/en/file-explorer.json`:
```json
{
  "title": "Files",
  "upload": "Upload",
  "uploading": "Uploading…",
  "viewGrid": "Grid view",
  "viewList": "List view",
  "root": "Root",
  "empty": "No files in this folder",
  "loading": "Loading…",
  "error": "Could not load files",
  "actions": {
    "rename": "Rename",
    "delete": "Delete",
    "download": "Download",
    "move": "Move"
  },
  "rename": {
    "label": "New name"
  },
  "delete": {
    "title": "Delete this file?",
    "description": "This action cannot be undone. The file will be permanently deleted.",
    "confirm": "Delete",
    "cancel": "Cancel"
  },
  "detail": {
    "size": "Size",
    "type": "Type",
    "modified": "Modified",
    "path": "Path",
    "noPreview": "No preview available for this file type"
  }
}
```

**Step 3: Write AR**

`messages/ar/file-explorer.json`:
```json
{
  "title": "الملفات",
  "upload": "رفع",
  "uploading": "جارٍ الرفع…",
  "viewGrid": "عرض شبكة",
  "viewList": "عرض قائمة",
  "root": "الجذر",
  "empty": "لا توجد ملفات في هذا المجلد",
  "loading": "جارٍ التحميل…",
  "error": "تعذّر تحميل الملفات",
  "actions": {
    "rename": "إعادة تسمية",
    "delete": "حذف",
    "download": "تنزيل",
    "move": "نقل"
  },
  "rename": {
    "label": "الاسم الجديد"
  },
  "delete": {
    "title": "حذف هذا الملف؟",
    "description": "لا يمكن التراجع عن هذا الإجراء. سيتم حذف الملف نهائيًا.",
    "confirm": "حذف",
    "cancel": "إلغاء"
  },
  "detail": {
    "size": "الحجم",
    "type": "النوع",
    "modified": "تاريخ التعديل",
    "path": "المسار",
    "noPreview": "لا تتوفر معاينة لهذا النوع من الملفات"
  }
}
```

**Step 4: Write ZH**

`messages/zh/file-explorer.json`:
```json
{
  "title": "文件",
  "upload": "上传",
  "uploading": "上传中…",
  "viewGrid": "网格视图",
  "viewList": "列表视图",
  "root": "根目录",
  "empty": "此文件夹中没有文件",
  "loading": "加载中…",
  "error": "无法加载文件",
  "actions": {
    "rename": "重命名",
    "delete": "删除",
    "download": "下载",
    "move": "移动"
  },
  "rename": {
    "label": "新名称"
  },
  "delete": {
    "title": "删除此文件？",
    "description": "此操作无法撤销，文件将被永久删除。",
    "confirm": "删除",
    "cancel": "取消"
  },
  "detail": {
    "size": "大小",
    "type": "类型",
    "modified": "修改时间",
    "path": "路径",
    "noPreview": "此文件类型不支持预览"
  }
}
```

**Step 5: Commit**

```bash
git add messages/
git commit -m "feat: add file-explorer i18n keys (fr/en/ar/zh)"
```

---

### Task 5: FileExplorer compound component — part 1 (helpers + Preview + Sheet)

**Files:**
- Create: `components/file-explorer.tsx`

**Step 1: Write the file — helpers, Preview, Sheet**

```tsx
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
                    asChild
                  >
                    <a
                      href={`/api/projects/preview?id=${selectedFile.id}`}
                      download={selectedFile.name}
                    >
                      <HugeiconsIcon icon={Download01Icon} />
                    </a>
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
```

Add a temporary `export {}` at the bottom so TypeScript doesn't complain about an empty module while the file is still being built:

```tsx
export {}
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Commit**

```bash
git add components/file-explorer.tsx
git commit -m "feat: add FileExplorer Preview and Sheet sub-components"
```

---

### Task 6: FileExplorer.Item

**Files:**
- Modify: `components/file-explorer.tsx` (remove temporary `export {}`, add Item)

**Step 1: Remove the `export {}` and append FileExplorer.Item**

```tsx
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
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Commit**

```bash
git add components/file-explorer.tsx
git commit -m "feat: add FileExplorer.Item with inline rename and context menu"
```

---

### Task 7: FileExplorer.Grid, FileExplorer.List, FileExplorer.DropZone

**Files:**
- Modify: `components/file-explorer.tsx`

**Step 1: Append the three sub-components**

```tsx
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
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Commit**

```bash
git add components/file-explorer.tsx
git commit -m "feat: add FileExplorer.Grid, List, DropZone sub-components"
```

---

### Task 8: FileExplorer.Toolbar

**Files:**
- Modify: `components/file-explorer.tsx`

**Step 1: Append Toolbar**

```tsx
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
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Commit**

```bash
git add components/file-explorer.tsx
git commit -m "feat: add FileExplorer.Toolbar with breadcrumbs, view toggle, upload"
```

---

### Task 9: FileExplorer root component and exports

**Files:**
- Modify: `components/file-explorer.tsx`

**Step 1: Append root component + sub-component assignments + exports**

```tsx
// ---------------------------------------------------------------------------
// FileExplorer (root — compound component)
// ---------------------------------------------------------------------------

type FileExplorerComponent = React.FC<
  React.ComponentProps<"div"> & { projectId: string }
> & {
  Toolbar: typeof FileExplorerToolbar
  DropZone: typeof FileExplorerDropZone
  Grid: typeof FileExplorerGrid
  List: typeof FileExplorerList
  Item: typeof FileExplorerItem
  Sheet: typeof FileExplorerSheet
  Preview: typeof FileExplorerPreview
}

const FileExplorer = function FileExplorer({
  projectId,
  className,
  ...props
}: React.ComponentProps<"div"> & { projectId: string }) {
  const value = useFileExplorerState(projectId)

  return (
    <FileExplorerContext.Provider value={value}>
      <div
        data-slot="file-explorer"
        className={cn("flex h-full flex-col overflow-hidden", className)}
        {...props}
      />
    </FileExplorerContext.Provider>
  )
} as FileExplorerComponent

FileExplorer.Toolbar = FileExplorerToolbar
FileExplorer.DropZone = FileExplorerDropZone
FileExplorer.Grid = FileExplorerGrid
FileExplorer.List = FileExplorerList
FileExplorer.Item = FileExplorerItem
FileExplorer.Sheet = FileExplorerSheet
FileExplorer.Preview = FileExplorerPreview

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  FileExplorer,
  FileExplorerDropZone,
  FileExplorerGrid,
  FileExplorerItem,
  FileExplorerList,
  FileExplorerPreview,
  FileExplorerSheet,
  FileExplorerToolbar,
}
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Commit**

```bash
git add components/file-explorer.tsx
git commit -m "feat: assemble FileExplorer compound component with all sub-components"
```

---

### Task 10: Page route

**Files:**
- Create: `app/[locale]/projects/[id]/files/page.tsx`

**Step 1: Write the page**

```tsx
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
```

**Step 2: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 3: Smoke test**

Run: `bun run dev`
Navigate to: `http://localhost:34000/fr/projects/test-id/files`

Verify:
- Toolbar shows "Racine" breadcrumb, grid/list toggle, upload button
- 6 mock items displayed (2 folders + 4 files)
- Clicking a file opens the side sheet with metadata
- Clicking a folder shows "Racine / Documents" in breadcrumb
- Hovering an item shows the `⋮` context menu button
- Drag-dropping a file onto the content area triggers upload (check network tab)
- View toggle switches between grid and list

**Step 4: Commit**

```bash
git add app/[locale]/projects/[id]/files/page.tsx
git commit -m "feat: add /projects/[id]/files page using FileExplorer"
```

---

### Task 11: View mode toggle in page (conditional Grid/List render)

The current page always renders `FileExplorer.Grid`. We need to switch based on `viewMode` context. This requires a small client wrapper since the page is a Server Component.

**Files:**
- Create: `app/[locale]/projects/[id]/files/_file-explorer-view.tsx`
- Modify: `app/[locale]/projects/[id]/files/page.tsx`

**Step 1: Create the client view switcher**

`app/[locale]/projects/[id]/files/_file-explorer-view.tsx`:

```tsx
"use client"

import { useFileExplorer } from "@/hooks/use-file-explorer"
import { FileExplorer } from "@/components/file-explorer"

export function FileExplorerView() {
  const { viewMode } = useFileExplorer()
  return viewMode === "list" ? <FileExplorer.List /> : <FileExplorer.Grid />
}
```

**Step 2: Update the page to use the switcher**

Modify `app/[locale]/projects/[id]/files/page.tsx`, replace `<FileExplorer.Grid />` with:

```tsx
import { FileExplorerView } from "./_file-explorer-view"

// Inside JSX:
<FileExplorer.DropZone>
  <div className="p-4">
    <FileExplorerView />
  </div>
</FileExplorer.DropZone>
```

**Step 3: Type-check + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: no errors

**Step 4: Commit**

```bash
git add app/[locale]/projects/[id]/files/
git commit -m "feat: wire view mode toggle to switch between Grid and List"
```

---

### Task 12: Docs file

**Files:**
- Create: `components/file-explorer.md`

**Step 1: Write the docs**

````markdown
# FileExplorer

Full-width project file explorer with grid/list view, file detail side sheet, drag-drop upload, and context menu actions (rename, delete, download).

## Usage

```tsx
import { FileExplorer } from "@/components/file-explorer"

<FileExplorer projectId="my-project-id">
  <FileExplorer.Toolbar />
  <FileExplorer.DropZone>
    <div className="p-4">
      <FileExplorer.Grid />
      {/* or <FileExplorer.List /> */}
    </div>
  </FileExplorer.DropZone>
  <FileExplorer.Sheet />
</FileExplorer>
```

## Sub-components

| Component | Description |
|-----------|-------------|
| `FileExplorer` | Root Context provider — requires `projectId` prop |
| `FileExplorer.Toolbar` | Breadcrumbs + view toggle (grid/list) + upload button |
| `FileExplorer.DropZone` | Drag-drop wrapper for the content area |
| `FileExplorer.Grid` | CSS grid display — folders first, then files |
| `FileExplorer.List` | Row list display with size and date columns |
| `FileExplorer.Item` | File/folder card used internally by Grid |
| `FileExplorer.Sheet` | Side sheet (slides from right) for file detail + preview |
| `FileExplorer.Preview` | Preview rendered inside the sheet (image, PDF, metadata) |

## Hook

```tsx
import { useFileExplorer } from "@/hooks/use-file-explorer"

const { files, currentPath, navigateTo, selectedFile, viewMode } =
  useFileExplorer()
```

Must be used inside a `<FileExplorer>` tree.

## State persistence

`viewMode` is persisted to `localStorage` under key `file-explorer:view-mode` (same hydration pattern as `sidebar.tsx`).

## API contract

Files are fetched from: `GET /api/projects/[id]/files?path=...`
Response: `{ items: FileItem[] }`

See `hooks/use-file-explorer.ts` for the full `FileItem` type and all API endpoints.
````

**Step 2: Commit**

```bash
git add components/file-explorer.md
git commit -m "docs: add file-explorer component documentation"
```

---

### Task 13: Build verification

**Step 1: Run full build**

Run: `bun run build`
Expected: build succeeds with no type errors

**Step 2: Common issues to fix**

- If Base UI `Dialog` import path is wrong, check `node_modules/@base-ui/react/` for the correct sub-path export. Try: `ls node_modules/@base-ui/react/` to see available exports.
- If i18n namespace `"file-explorer"` is not found at runtime, check that `next-intl` auto-loads all JSON files in `messages/[locale]/`. With `getMessages()` in the layout (already done), all namespace files are loaded automatically.
- If `SheetClose` `render` prop API differs from `AlertDialogCancel`'s, check `alert-dialog.tsx` line 152 for the correct pattern (`render={<Button .../>}` vs `asChild`).

**Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build errors for file explorer"
```

---

## Summary

| Task | Files created/modified | Commit |
|------|----------------------|--------|
| 1 | `hooks/use-file-explorer.ts` | feat: add use-file-explorer hook |
| 2 | `app/api/projects/[id]/files/...` (4 files) | feat: add mock API routes |
| 3 | `components/ui/sheet.tsx` | feat: add Sheet UI component |
| 4 | `messages/*/file-explorer.json` (4 files) | feat: add file-explorer i18n keys |
| 5 | `components/file-explorer.tsx` (start) | feat: add Preview + Sheet sub-components |
| 6 | `components/file-explorer.tsx` | feat: add Item sub-component |
| 7 | `components/file-explorer.tsx` | feat: add Grid, List, DropZone |
| 8 | `components/file-explorer.tsx` | feat: add Toolbar |
| 9 | `components/file-explorer.tsx` | feat: assemble root + exports |
| 10 | `app/[locale]/projects/[id]/files/page.tsx` | feat: add project files page |
| 11 | `_file-explorer-view.tsx` + page update | feat: wire view mode toggle |
| 12 | `components/file-explorer.md` | docs: add file-explorer docs |
| 13 | build verification | fix: resolve build errors (if any) |
