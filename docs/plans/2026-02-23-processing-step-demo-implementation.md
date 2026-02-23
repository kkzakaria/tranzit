# ProcessingStep Demo Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive demo page at `/demo/processing-step` showcasing all four states of the `ProcessingStep` component with a file-processing scenario, navigation buttons, and an error simulation button.

**Architecture:** RSC shell `page.tsx` delegates to a `"use client"` component `_demo.tsx`. Sidebar entry added to `app-sidebar.tsx`. Navigation translation key added to all four locale files. No new i18n namespace needed — `navigation` is already loaded.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, `@hugeicons/react`, `ProcessingStep` compound component from `@/components/processing-step`, `Button` from `@/components/ui/button`.

---

### Task 1: i18n — add `processingStep` key to all four locales

**Files:**
- Modify: `messages/fr/navigation.json`
- Modify: `messages/en/navigation.json`
- Modify: `messages/ar/navigation.json`
- Modify: `messages/zh/navigation.json`

**Step 1: Update all four files**

`messages/fr/navigation.json` — add after `"panelLayout"`:
```json
"processingStep": "Étapes de traitement"
```

`messages/en/navigation.json` — add after `"panelLayout"`:
```json
"processingStep": "Processing Steps"
```

`messages/ar/navigation.json` — add after `"panelLayout"`:
```json
"processingStep": "خطوات المعالجة"
```

`messages/zh/navigation.json` — add after `"panelLayout"`:
```json
"processingStep": "处理步骤"
```

Final `messages/fr/navigation.json` should be:
```json
{
  "home": "Accueil",
  "dashboard": "Tableau de bord",
  "projects": "Projets",
  "panelLayout": "Mise en page panneau",
  "processingStep": "Étapes de traitement",
  "account": "Compte",
  "profile": "Profil",
  "settings": "Paramètres"
}
```

**Step 2: Verify JSON is valid**

Run: `npx tsc --noEmit`
Expected: zero errors (TypeScript will catch malformed JSON imports)

**Step 3: Commit**

```bash
git add messages/fr/navigation.json messages/en/navigation.json messages/ar/navigation.json messages/zh/navigation.json
git commit -m "feat: add processingStep translation key to navigation messages"
```

---

### Task 2: Sidebar — add `/demo/processing-step` entry

**Files:**
- Modify: `components/app-sidebar.tsx`

**Step 1: Add the import**

In `components/app-sidebar.tsx`, add `Loading03Icon` to the existing import from `@hugeicons/core-free-icons` (it is already used in `processing-step.tsx` so it is confirmed available in the free tier):

```tsx
import {
  Home01Icon,
  Folder01Icon,
  LayoutTwoColumnIcon,
  Settings01Icon,
  DashboardSquare01Icon,
  UserIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
```

**Step 2: Add the sidebar item**

After the `panelLayout` `SidebarItem` block (around line 66), add:

```tsx
<SidebarItem
  href="/demo/processing-step"
  icon={Loading03Icon}
  active={pathname === "/demo/processing-step"}
  className={activeItemClass}
>
  {t("processingStep")}
</SidebarItem>
```

**Step 3: Type-check and lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: zero errors

**Step 4: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: add ProcessingStep demo entry to sidebar"
```

---

### Task 3: RSC shell — `page.tsx`

**Files:**
- Create: `app/[locale]/demo/processing-step/page.tsx`

**Step 1: Create the file**

```tsx
import type { Metadata } from "next"

import { ProcessingStepDemo } from "./_demo"

export const metadata: Metadata = {
  title: "Étapes de traitement — Tranzit",
}

export default function ProcessingStepDemoPage() {
  return <ProcessingStepDemo />
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors (will error until `_demo.tsx` exists — create both in the same commit)

**Step 3: Commit — after Task 4 is done (commit both files together)**

Skip commit here; commit together with `_demo.tsx` in Task 4.

---

### Task 4: Client demo component — `_demo.tsx`

**Files:**
- Create: `app/[locale]/demo/processing-step/_demo.tsx`

**Step 1: Create the file**

```tsx
"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Settings01Icon,
  UploadIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { ProcessingStep } from "@/components/processing-step"
import type { StepStatus } from "@/components/processing-step"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface StepDef {
  step: number
  label: string
  description: string
  icon: React.ReactNode
}

const STEPS: StepDef[] = [
  {
    step: 1,
    label: "Upload",
    description: "Envoi du fichier vers le serveur.",
    icon: <HugeiconsIcon icon={UploadIcon} />,
  },
  {
    step: 2,
    label: "Validation",
    description: "Vérification du format et de l'intégrité du fichier.",
    icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} />,
  },
  {
    step: 3,
    label: "Traitement",
    description: "Analyse et transformation des données.",
    icon: <HugeiconsIcon icon={Settings01Icon} />,
  },
  {
    step: 4,
    label: "Terminé",
    description: "Fichier traité avec succès. Résultats disponibles.",
    icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} />,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveItemStatus(
  step: number,
  currentStep: number,
  errorStep: number | null
): StepStatus {
  if (errorStep === step) return "error"
  if (step < currentStep) return "completed"
  if (step === currentStep) return "active"
  return "waiting"
}

function getActiveStep(currentStep: number): StepDef | undefined {
  return STEPS.find((s) => s.step === currentStep)
}

const STATUS_LABELS: Record<StepStatus, string> = {
  waiting: "En attente",
  active: "En cours",
  completed: "Terminé",
  error: "Erreur",
}

// ---------------------------------------------------------------------------
// ProcessingStepDemo
// ---------------------------------------------------------------------------

export function ProcessingStepDemo() {
  // currentStep: 1–5 (5 = all completed)
  const [currentStep, setCurrentStep] = useState(1)
  const [errorStep, setErrorStep] = useState<number | null>(null)

  const hasError = errorStep !== null
  const allCompleted = currentStep > STEPS.length
  const activeStepDef = allCompleted ? STEPS[STEPS.length - 1] : getActiveStep(currentStep)

  function handleNext() {
    if (hasError || allCompleted) return
    setCurrentStep((s) => s + 1)
    setErrorStep(null)
  }

  function handlePrev() {
    if (currentStep <= 1) return
    if (hasError) {
      // First click resets error without going back
      setErrorStep(null)
      return
    }
    setCurrentStep((s) => s - 1)
  }

  function handleToggleError() {
    if (allCompleted) return
    setErrorStep((prev) => (prev === currentStep ? null : currentStep))
  }

  const activeStatus: StepStatus = hasError
    ? "error"
    : allCompleted
      ? "completed"
      : "active"

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Traitement de fichier
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulez les différents états du composant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            ProcessingStep
          </code>
          .
        </p>
      </div>

      {/* Stepper */}
      <div className="w-full max-w-2xl">
        <ProcessingStep>
          {STEPS.map(({ step, label, icon }) => (
            <ProcessingStep.Item
              key={step}
              step={step}
              label={label}
              icon={icon}
              status={deriveItemStatus(step, currentStep, errorStep)}
            />
          ))}
        </ProcessingStep>
      </div>

      {/* Active step info */}
      <div className="mt-8 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              activeStatus === "error" ? "text-destructive" : "text-foreground"
            )}
          >
            {STATUS_LABELS[activeStatus]}
          </span>
          <span className="text-sm text-muted-foreground">—</span>
          <span className="text-sm text-muted-foreground">
            {activeStepDef?.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {hasError
            ? "Une erreur est survenue. Corrigez le problème et réessayez."
            : allCompleted
              ? "Fichier traité avec succès. Résultats disponibles."
              : (activeStepDef?.description ?? "")}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep <= 1}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} data-icon="inline-start" />
          Précédent
        </Button>

        <Button
          variant={hasError ? "outline" : "outline"}
          onClick={handleToggleError}
          disabled={allCompleted}
          className={cn(
            hasError && "border-destructive text-destructive hover:bg-destructive/10"
          )}
        >
          <HugeiconsIcon
            icon={hasError ? CheckmarkCircle02Icon : Cancel01Icon}
            data-icon="inline-start"
          />
          {hasError ? "Réinitialiser l'erreur" : "Simuler une erreur"}
        </Button>

        <Button
          onClick={handleNext}
          disabled={hasError || allCompleted}
        >
          Suivant
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
      </div>

      {/* Debug info */}
      <div className="mt-8 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Étape {Math.min(currentStep, STEPS.length)}/{STEPS.length}
          {" · "}
          État :{" "}
          <code className="font-mono">{activeStatus}</code>
          {errorStep !== null && (
            <>
              {" · "}
              Erreur sur l'étape{" "}
              <code className="font-mono">{errorStep}</code>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Type-check and lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: zero errors

**Step 3: Commit both page.tsx and _demo.tsx together**

```bash
git add app/[locale]/demo/processing-step/page.tsx app/[locale]/demo/processing-step/_demo.tsx
git commit -m "feat: add ProcessingStep interactive demo page"
```

---

### Task 5: Build verification

**Step 1: Production build**

Run: `bun run build`
Expected: ✓ Compiled successfully, 0 errors

**Step 2: Dev server verification**

Run: `bun run dev`
Open: `http://localhost:34000/fr/demo/processing-step`

Verify:
- Sidebar shows "Étapes de traitement" entry with spinner icon
- Page loads with 4-step stepper (Upload → Validation → Traitement → Terminé)
- Step 1 starts as active (filled circle, spinner)
- "Précédent" is disabled on step 1
- "Suivant" advances to next step, connector becomes solid after completed steps
- "Simuler une erreur" marks current step as error (red circle, ✕)
- While in error: "Suivant" is disabled, status area shows error message
- "Réinitialiser l'erreur" (after error) resets back to active
- "Précédent" when in error: clears error without going back
- After step 4 → "Suivant": all steps completed, "Suivant" disabled
- Debug info updates at bottom

**Step 3: Check locale switching**

Open: `http://localhost:34000/en/demo/processing-step`
Verify: sidebar shows "Processing Steps"

**Step 4: Commit if no changes needed, or fix and re-commit**

If all good, no additional commit needed.
