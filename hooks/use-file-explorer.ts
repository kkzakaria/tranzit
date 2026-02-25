"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FileItem, Breadcrumb } from "@/types/file-explorer"
export type { FileItem, Breadcrumb } // re-export for consumers

export interface FileExplorerContextValue {
  projectId: string
  currentPath: string
  navigateTo: (path: string) => void
  breadcrumbs: Breadcrumb[]
  files: FileItem[]
  isLoading: boolean
  error: string | null
  mutationError: string | null
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
  getDownloadUrl: (id: string) => Promise<string>
  setMutationError: (err: string | null) => void
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

// ---------------------------------------------------------------------------
// Backend document shape — from types/api.ts paths["/api/v1/dossiers/{dossierId}/documents"]
// ---------------------------------------------------------------------------

interface ApiDocument {
  id: string
  dossierId: string
  nom: string
  typeDoc: string
  taille: number
  uploadedBy: string
  createdAt: string
}

/** Map a backend ApiDocument to the local FileItem type */
function toFileItem(doc: ApiDocument): FileItem {
  return {
    id: doc.id,
    name: doc.nom,
    type: "file",
    path: `/${doc.nom}`,
    modifiedAt: doc.createdAt,
    size: doc.taille,
    mimeType: undefined,
  }
}

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
  const [mutationError, setMutationError] = useState<string | null>(null)
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
    } catch (e) {
      console.warn("[FileExplorer] Failed to persist view mode:", e)
    }
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

  // Fetch documents for the dossier whenever projectId changes
  useEffect(() => {
    if (!API_URL) {
      setError(
        "Configuration manquante : NEXT_PUBLIC_API_URL n'est pas définie. " +
        "Créez .env.local avec NEXT_PUBLIC_API_URL=http://localhost:34001"
      )
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetch(
      `${API_URL}/api/v1/dossiers/${projectId}/documents`,
      { credentials: 'include' }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ data: ApiDocument[] }>
      })
      .then(({ data }) => {
        if (!cancelled) setFiles(data.map(toFileItem))
      })
      .catch((e: unknown) => {
        console.error("[FileExplorer] Failed to fetch documents:", e)
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erreur inconnue")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

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
      setMutationError(null)
      try {
        // Upload files sequentially — backend accepts one file per request
        for (const file of newFiles) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("typeDoc", "AUTRE")
          const res = await fetch(
            `${API_URL}/api/v1/dossiers/${projectId}/documents`,
            { method: "POST", body: formData, credentials: "include" }
          )
          if (!res.ok) throw new Error(`Échec de l'envoi de "${file.name}" (HTTP ${res.status})`)
        }
        setUploadProgress(100)
        // Refresh document list
        const r = await fetch(
          `${API_URL}/api/v1/dossiers/${projectId}/documents`,
          { credentials: "include" }
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = (await r.json()) as { data?: unknown }
        if (!Array.isArray(data?.data)) throw new Error("Invalid response")
        setFiles((data.data as ApiDocument[]).map(toFileItem))
      } catch (e) {
        console.error("[FileExplorer] Failed to upload files:", e)
        setMutationError(e instanceof Error ? e.message : "Erreur inconnue")
        throw e // re-throw so callers can handle too
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [projectId]
  )

  const renameFile = useCallback(
    async (_id: string, _name: string) => {
      // Renaming documents is not supported by the tranzit-api backend
      const msg = "Renommer un document n'est pas supporté par l'API"
      setMutationError(msg)
      throw new Error(msg)
    },
    []
  )

  const deleteFile = useCallback(
    async (id: string) => {
      setMutationError(null)
      try {
        const res = await fetch(`${API_URL}/api/v1/documents/${id}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setFiles((prev) => prev.filter((f) => f.id !== id))
        setSelectedFile((prev) => (prev?.id === id ? null : prev))
      } catch (e) {
        console.error("[FileExplorer] Failed to delete file:", e)
        setMutationError(e instanceof Error ? e.message : "Erreur inconnue")
        throw e
      }
    },
    []
  )

  const moveFile = useCallback(
    async (_id: string, _targetPath: string) => {
      // Moving documents is not supported by the tranzit-api backend
      throw new Error("Déplacer un document n'est pas supporté par l'API")
    },
    []
  )

  const getDownloadUrl = useCallback(async (id: string): Promise<string> => {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}/url`, { credentials: "include" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json: unknown = await res.json()
    if (
      typeof json !== "object" || json === null ||
      typeof (json as { data?: { url?: unknown } }).data?.url !== "string"
    ) {
      throw new Error("Réponse inattendue du serveur : URL manquante")
    }
    return (json as { data: { url: string } }).data.url
  }, [])

  return useMemo<FileExplorerContextValue>(
    () => ({
      projectId,
      currentPath,
      navigateTo,
      breadcrumbs,
      files,
      isLoading,
      error,
      mutationError,
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
      getDownloadUrl,
      setMutationError,
    }),
    [
      projectId,
      currentPath,
      navigateTo,
      breadcrumbs,
      files,
      isLoading,
      error,
      mutationError,
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
      getDownloadUrl,
      setMutationError,
    ]
  )
}
