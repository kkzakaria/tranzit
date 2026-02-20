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
| `FileExplorer.Item` | File/folder card used internally by Grid and List |
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

`viewMode` is persisted to `localStorage` under key `file-explorer:v1:view-mode` (same hydration pattern as `sidebar.tsx`).

## API contract

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[id]/files?path=...` | List files at path. Response: `{ items: FileItem[] }` |
| POST | `/api/projects/[id]/files/upload` | Upload files (multipart: `files`, `path`). Response: `{ ok: true }` |
| PATCH | `/api/projects/[id]/files/[fileId]` | Rename. Body: `{ name }`. Response: `{ ok: true }` |
| DELETE | `/api/projects/[id]/files/[fileId]` | Delete file. Response: `{ ok: true }` |
| POST | `/api/projects/[id]/files/[fileId]/move` | Move. Body: `{ targetPath }`. Response: `{ ok: true }` |

> **Note:** Image/PDF preview URLs (`/api/projects/preview?id=...`) are placeholder endpoints — replace with your backend's real preview endpoint before production.

See `hooks/use-file-explorer.ts` for the full `FileItem` type.
