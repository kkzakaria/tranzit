import type { Metadata } from "next"

import { ProcessingStepDemo } from "./_demo"

export const metadata: Metadata = {
  title: "Étapes de traitement — Tranzit",
}

export default function ProcessingStepDemoPage() {
  return <ProcessingStepDemo />
}
