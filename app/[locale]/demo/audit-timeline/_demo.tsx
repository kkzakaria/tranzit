"use client"

import { useState, useCallback, useEffect } from "react"
import { AuditTimeline } from "@/components/audit-timeline"
import type { AuditEvent } from "@/hooks/use-audit-timeline"

const now = Date.now()
const min = 60_000
const hr = 3_600_000
const day = 86_400_000

const ALL_EVENTS: AuditEvent[] = [
  {
    id: "1",
    action: "login",
    status: "success",
    timestamp: new Date(now - 5 * min),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Connexion réussie depuis 192.168.1.42.",
    metadata: { ip: "192.168.1.42", browser: "Chrome 121", os: "macOS" },
  },
  {
    id: "2",
    action: "import",
    status: "success",
    timestamp: new Date(now - 8 * min),
    actor: { name: "Système" },
    message: "Fichier client_2024.csv importé avec succès.",
    metadata: { rows: 1240, size: "2.4 MB", format: "CSV" },
  },
  {
    id: "3",
    action: "update",
    status: "error",
    timestamp: new Date(now - 15 * min),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Échec de la mise à jour : contrainte de clé étrangère violée.",
    metadata: { table: "clients", field: "region_id", value: 999 },
  },
  {
    id: "4",
    action: "approve",
    status: "success",
    timestamp: new Date(now - 30 * min),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Demande #4821 approuvée.",
  },
  {
    id: "5",
    action: "create",
    status: "success",
    timestamp: new Date(now - 45 * min),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Nouveau projet « Migration Q1 » créé.",
    metadata: { projectId: "proj_4821", type: "migration" },
  },
  {
    id: "6",
    action: "delete",
    status: "warning",
    timestamp: new Date(now - 2 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Archive de janvier 2023 supprimée (soft delete).",
    metadata: { archiveId: "arch_2301", retentionDays: 90 },
  },
  {
    id: "7",
    action: "export",
    status: "success",
    timestamp: new Date(now - 3 * hr),
    actor: { name: "Système" },
    message: "Rapport mensuel exporté en PDF.",
    metadata: { size: "1.1 MB", pages: 24 },
  },
  {
    id: "8",
    action: "reject",
    status: "error",
    timestamp: new Date(now - 4 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Demande #4815 rejetée : données incomplètes.",
  },
  {
    id: "9",
    action: "update",
    status: "info",
    timestamp: new Date(now - 6 * hr),
    actor: { name: "Système" },
    message: "Mise à jour automatique des taux de change.",
    metadata: { currencies: ["EUR", "USD", "GBP"], source: "ECB" },
  },
  {
    id: "10",
    action: "login",
    status: "success",
    timestamp: new Date(now - 8 * hr),
    actor: { name: "Carol Lee", role: "Lecteur" },
    message: "Connexion réussie.",
  },
  {
    id: "11",
    action: "import",
    status: "error",
    timestamp: new Date(now - 1 * day - 1 * hr),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Import échoué : format de fichier non supporté.",
    metadata: { filename: "rapport.xlsx", expectedFormat: "CSV" },
  },
  {
    id: "12",
    action: "create",
    status: "success",
    timestamp: new Date(now - 1 * day - 3 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Nouvel utilisateur « carol.lee » créé.",
    metadata: { role: "Lecteur", email: "carol@example.com" },
  },
  {
    id: "13",
    action: "approve",
    status: "success",
    timestamp: new Date(now - 1 * day - 5 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Demande #4800 approuvée.",
  },
  {
    id: "14",
    action: "logout",
    status: "info",
    timestamp: new Date(now - 1 * day - 6 * hr),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Déconnexion.",
  },
  {
    id: "15",
    action: "export",
    status: "warning",
    timestamp: new Date(now - 2 * day - 2 * hr),
    actor: { name: "Système" },
    message: "Export partiel : 3 lignes ignorées (valeurs nulles).",
    metadata: { skippedRows: 3, totalRows: 1240 },
  },
  {
    id: "16",
    action: "update",
    status: "success",
    timestamp: new Date(now - 2 * day - 4 * hr),
    actor: { name: "Carol Lee", role: "Lecteur" },
    message: "Profil mis à jour.",
  },
  {
    id: "17",
    action: "delete",
    status: "error",
    timestamp: new Date(now - 2 * day - 6 * hr),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Suppression refusée : enregistrement verrouillé.",
    metadata: { recordId: "rec_7712", lockedBy: "alice.martin" },
  },
  {
    id: "18",
    action: "import",
    status: "success",
    timestamp: new Date(now - 3 * day - 1 * hr),
    actor: { name: "Système" },
    message: "Import planifié terminé avec succès.",
    metadata: { rows: 870, duration: "4.2s" },
  },
  {
    id: "19",
    action: "create",
    status: "success",
    timestamp: new Date(now - 3 * day - 3 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Nouveau projet « Audit Q4 » créé.",
  },
  {
    id: "20",
    action: "login",
    status: "error",
    timestamp: new Date(now - 3 * day - 5 * hr),
    actor: { name: "Inconnu" },
    message: "Tentative de connexion échouée (mot de passe incorrect).",
    metadata: { ip: "203.0.113.42", attempts: 3 },
  },
]

const PAGE_SIZE = 10

export function AuditTimelineDemo() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [groupByDate, setGroupByDate] = useState(false)

  const visible = ALL_EVENTS.slice(0, visibleCount).reverse()
  const hasMore = visibleCount < ALL_EVENTS.length

  useEffect(() => {
    if (!loading) return
    const id = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, ALL_EVENTS.length))
      setLoading(false)
    }, 800)
    return () => clearTimeout(id)
  }, [loading])

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    setLoading(true)
  }, [loading, hasMore])

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Historique d&apos;audit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualisez le journal d&apos;activité avec le composant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            AuditTimeline
          </code>
          .
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={groupByDate}
            onChange={(e) => setGroupByDate(e.target.checked)}
            className="size-4 accent-primary"
          />
          Grouper par date
        </label>
        <span className="text-xs text-muted-foreground ml-auto">
          {visible.length} / {ALL_EVENTS.length} événements
        </span>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl">
        <AuditTimeline
          events={visible}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
          groupByDate={groupByDate}
        />
      </div>
    </div>
  )
}
