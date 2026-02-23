import type { Metadata } from "next"

import { AuditTimelineDemo } from "./_demo"

export const metadata: Metadata = {
  title: "Historique d'audit — Tranzit",
}

export default function AuditTimelineDemoPage() {
  return <AuditTimelineDemo />
}
