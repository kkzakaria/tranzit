"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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

const VIEW_MODE_KEY = "file-explorer:v1:view-mode"

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

  // Stable ref to currentPath so uploadFiles doesn't recreate on every navigation
  const currentPathRef = useRef(currentPath)
  useEffect(() => {
    currentPathRef.current = currentPath
  }, [currentPath])

  // Hydrate viewMode from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY)
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
    const crumbs: Breadcrumb[] = [{ name: "", path: "/" }]
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
        console.error("[FileExplorer] Failed to fetch files:", e)
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
        formData.append("path", currentPathRef.current)
        const res = await fetch(
          `/api/projects/${projectId}/files/upload`,
          { method: "POST", body: formData }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setUploadProgress(100)
        // Refresh file list
        const r = await fetch(
          `/api/projects/${projectId}/files?path=${encodeURIComponent(currentPathRef.current)}`
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const { items } = (await r.json()) as { items: FileItem[] }
        setFiles(items)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [projectId]
  )

  const renameFile = useCallback(
    async (id: string, name: string) => {
      const res = await fetch(`/api/projects/${projectId}/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)))
      setSelectedFile((prev) =>
        prev?.id === id ? { ...prev, name } : prev
      )
    },
    [projectId]
  )

  const deleteFile = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/files/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFiles((prev) => prev.filter((f) => f.id !== id))
      setSelectedFile((prev) => (prev?.id === id ? null : prev))
    },
    [projectId]
  )

  const moveFile = useCallback(
    async (id: string, targetPath: string) => {
      const res = await fetch(`/api/projects/${projectId}/files/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPath }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
