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

`viewMode` is persisted to `localStorage` under key `file-explorer:view-mode` (same hydration pattern as `sidebar.tsx`).

## API contract

Files are fetched from: `GET /api/projects/[id]/files?path=...`
Response: `{ items: FileItem[] }`

See `hooks/use-file-explorer.ts` for the full `FileItem` type and all API endpoints.
