// Shared types for the file explorer — no "use client" directive so they
// can be imported by both client components and server-side API routes.

interface FileItemBase {
  id: string
  name: string
  modifiedAt: string // ISO 8601
  path: string // absolute, starts with "/"
}

export interface FolderItem extends FileItemBase {
  type: "folder"
}

export interface FileEntry extends FileItemBase {
  type: "file"
  size?: number // bytes
  mimeType?: string // e.g. "image/png"
}

export type FileItem = FolderItem | FileEntry

export interface Breadcrumb {
  name: string
  path: string
}
