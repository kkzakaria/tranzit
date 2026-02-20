import { NextRequest, NextResponse } from "next/server"
import type { FileItem } from "@/types/file-explorer"

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const path = req.nextUrl.searchParams.get("path") ?? "/"
  const items = MOCK_FILES.filter((f) => {
    const dir = f.path.substring(0, f.path.lastIndexOf("/")) || "/"
    return dir === path
  })
  return NextResponse.json({ items })
}
