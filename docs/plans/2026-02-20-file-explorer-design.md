# File Explorer — Design Document

**Date:** 2026-02-20
**Status:** Approved

## Context

Tranzit needs a file explorer scoped to a project (`/projects/[id]/files`). Files are fetched from a remote API/backend. The explorer is a full-width dedicated page using a compound component pattern consistent with the existing codebase (`sidebar.tsx`, `panel-layout.tsx`).

## User Requirements

- Navigate folders within a project
- Select a file to view its detail and preview in a side sheet
- Upload files via drag-drop or toolbar button
- Perform actions on files: rename (inline), delete (with confirmation), move/copy, download
- File data comes from a remote API — no local filesystem access

## Architecture

### Route

```
app/[locale]/projects/[id]/files/page.tsx
```

### Compound Component: `FileExplorer`

**File:** `components/file-explorer.tsx`
**Hook:** `hooks/use-file-explorer.ts`
**Docs:** `components/file-explorer.md`

Sub-components:

| Component | Responsibility |
|-----------|---------------|
| `FileExplorer` | Context provider root — owns all state |
| `FileExplorer.Toolbar` | Breadcrumbs + view toggle (grid/list) + upload button + upload progress |
| `FileExplorer.DropZone` | Drag-drop wrapper for the content area |
| `FileExplorer.Grid` | CSS grid display of `FileExplorer.Item` (default view) |
| `FileExplorer.List` | Table/list display of `FileExplorer.Item` |
| `FileExplorer.Item` | Individual file or folder — hover shows action button (⋮), click selects |
| `FileExplorer.Sheet` | Side sheet (Base UI Dialog) for file detail/preview, slides from right |
| `FileExplorer.Preview` | Preview content inside the sheet, adapts to mime type |

### Hook: `use-file-explorer.ts`

State managed:

```ts
interface FileExplorerContextValue {
  projectId: string
  currentPath: string          // e.g. "/documents/contracts"
  navigateTo: (path: string) => void
  breadcrumbs: Breadcrumb[]    // derived from currentPath
  files: FileItem[]
  isLoading: boolean
  error: string | null
  selectedFile: FileItem | null
  selectFile: (file: FileItem | null) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  isUploading: boolean
  uploadProgress: number       // 0-100
  uploadFiles: (files: File[]) => Promise<void>
  renameFile: (id: string, name: string) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  moveFile: (id: string, targetPath: string) => Promise<void>
}
```

`viewMode` persisted to `localStorage` (same hydration pattern as sidebar/panel-layout).

## Data Types

```ts
interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  size?: number           // bytes, undefined for folders
  mimeType?: string       // e.g. "image/png", undefined for folders
  modifiedAt: string      // ISO 8601
  path: string            // full path from project root
}

interface Breadcrumb {
  name: string
  path: string
}
```

## API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| List files | GET | `/api/projects/[id]/files?path=...` |
| Upload | POST (multipart) | `/api/projects/[id]/files/upload` |
| Rename | PATCH | `/api/projects/[id]/files/[fileId]` |
| Delete | DELETE | `/api/projects/[id]/files/[fileId]` |
| Move/Copy | POST | `/api/projects/[id]/files/[fileId]/move` |

Response shape for list:

```json
{
  "items": [FileItem, ...]
}
```

Data fetching is client-side (`useEffect` + `useState`) to keep the component reactive after mutations.

## UI Behavior

### Toolbar

- Breadcrumb trail: `Project root > documents > contracts` — each segment is clickable
- Right side: view toggle (grid icon / list icon) + "Upload" button
- During upload: progress bar replaces upload button (or appears below toolbar)

### Grid / List

- **Grid:** responsive CSS grid — 2 cols on mobile, 4-6 cols on desktop depending on container width
- **List:** table with columns: icon, name, size, modified date, actions
- Folders listed before files (alphabetical within each group)
- Double-click (or Enter) on folder → `navigateTo(folder.path)`
- Single click on file → `selectFile(file)` → opens Sheet

### Hover Actions on Item

- `⋮` button appears on hover (or focus) on each item
- Opens a Base UI `Popup` menu with: Rename, Delete, Download, Move
- Rename: replaces the item label with an inline `<input>` on the spot

### DropZone

- Entire content area is a drag-drop target
- `dragover` → visual highlight border on the drop zone
- Drop → calls `uploadFiles()`

### Sheet (File Detail)

- Base UI `Dialog` configured as a slide-in sheet from the right
- Desktop: `width: 420px`, fixed position at right edge
- Mobile: full screen, `overscroll-behavior: contain`
- Header: filename + icon buttons (Download, Rename, Delete, Close)
- Body: `FileExplorer.Preview`

### Preview by MIME Type

| Type | Rendering |
|------|-----------|
| `image/*` | `<img>` with `object-fit: contain`, max height |
| `text/*`, `application/json` | Scrollable `<pre>` |
| `application/pdf` | `<iframe>` |
| Other | File type icon + metadata table (name, size, path, modified) |

### Delete Confirmation

- Base UI `Dialog` — "Supprimer ce fichier ?" with Confirm/Cancel buttons
- Triggered from context menu or Sheet header button

## Mobile Adaptations

- Sheet opens full screen
- `overscroll-behavior: contain` on Sheet content
- Breadcrumbs scroll horizontally (no wrap)
- Toolbar: condensed, upload button shows icon only
- Bottom safe area: `padding-bottom: env(safe-area-inset-bottom)` on Sheet

## Accessibility

- All transitions/animations have `motion-reduce:` variants
- File/folder items: `role="button"`, keyboard navigable (Enter/Space to activate, arrow keys to move)
- Sheet: `aria-label`, focus trapped while open, `aria-live="polite"` for upload status
- Drag-drop has keyboard alternative (toolbar upload button)

## File Structure

```
components/
  file-explorer.tsx      ← compound component
  file-explorer.md       ← usage docs
hooks/
  use-file-explorer.ts   ← context + state
app/[locale]/projects/[id]/files/
  page.tsx               ← route page
```
