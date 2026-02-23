# ProcessingStep — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a horizontal workflow stepper compound component with four states (waiting, active, completed, error), an optional icon above each step, and a connector line between steps.

**Architecture:** Compound component (`ProcessingStep` + `ProcessingStep.Item`) backed by a React context in `hooks/use-processing-step.ts`. The parent controls state via `currentStep` prop or explicit `status` per item. No internal state.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `@hugeicons/react`, `cn()` from `lib/utils.ts`, Base UI patterns.

---

### Task 1: Hook — context + types

**Files:**
- Create: `hooks/use-processing-step.ts`

**Step 1: Create the hook file**

```ts
"use client"

import { createContext, useContext } from "react"

export type StepStatus = "waiting" | "active" | "completed" | "error"

export interface ProcessingStepContextValue {
  currentStep: number | undefined
}

export const ProcessingStepContext =
  createContext<ProcessingStepContextValue | null>(null)

export function useProcessingStep() {
  const ctx = useContext(ProcessingStepContext)
  if (!ctx)
    throw new Error("useProcessingStep must be used inside <ProcessingStep>")
  return ctx
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add hooks/use-processing-step.ts
git commit -m "feat: add ProcessingStep context and types"
```

---

### Task 2: Component — ProcessingStep root + Item sub-component

**Files:**
- Create: `components/processing-step.tsx`

**Step 1: Create the component file**

```tsx
// Documentation & usage examples: ./processing-step.md

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  ProcessingStepContext,
  useProcessingStep,
  type StepStatus,
} from "@/hooks/use-processing-step"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStatus(
  step: number,
  currentStep: number | undefined,
  explicit: StepStatus | undefined
): StepStatus {
  if (explicit !== undefined) return explicit
  if (currentStep === undefined) return "waiting"
  if (step < currentStep) return "completed"
  if (step === currentStep) return "active"
  return "waiting"
}

// ---------------------------------------------------------------------------
// ProcessingStep.Item
// ---------------------------------------------------------------------------

function ProcessingStepItem({
  step,
  label,
  icon,
  status: statusProp,
  className,
  ...props
}: {
  step: number
  label: string
  icon?: React.ReactNode
  status?: StepStatus
  className?: string
} & Omit<React.ComponentProps<"li">, "children">) {
  const { currentStep } = useProcessingStep()
  const status = deriveStatus(step, currentStep, statusProp)

  const indicatorColors: Record<StepStatus, string> = {
    waiting: "border-border bg-background text-muted-foreground",
    active: "border-primary bg-primary text-primary-foreground",
    completed: "border-primary bg-primary text-primary-foreground",
    error: "border-destructive bg-destructive text-destructive-foreground",
  }

  const labelColors: Record<StepStatus, string> = {
    waiting: "text-muted-foreground",
    active: "text-foreground font-medium",
    completed: "text-foreground",
    error: "text-destructive",
  }

  const iconColors: Record<StepStatus, string> = {
    waiting: "text-muted-foreground",
    active: "text-primary",
    completed: "text-primary",
    error: "text-destructive",
  }

  return (
    <li
      data-slot="processing-step-item"
      data-status={status}
      aria-current={status === "active" ? "step" : undefined}
      className={cn("flex flex-col items-center gap-1.5", className)}
      {...props}
    >
      {/* Optional icon above indicator */}
      <div className={cn("flex h-4 items-center justify-center", iconColors[status])}>
        {icon ? (
          <span className="[&>svg]:size-4">{icon}</span>
        ) : (
          <span className="h-4" aria-hidden />
        )}
      </div>

      {/* Indicator circle */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none",
          indicatorColors[status]
        )}
        aria-hidden
      >
        {status === "active" && (
          <HugeiconsIcon
            icon={Loading03Icon}
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
        )}
        {status === "completed" && (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
        )}
        {status === "error" && (
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        )}
      </div>

      {/* Label */}
      <span className={cn("text-xs transition-colors motion-reduce:transition-none", labelColors[status])}>
        {label}
      </span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// ProcessingStep (root — compound component)
// ---------------------------------------------------------------------------

type ProcessingStepComponent = React.FC<
  React.ComponentProps<"ol"> & { currentStep?: number }
> & {
  Item: typeof ProcessingStepItem
}

const ProcessingStep = function ProcessingStep({
  currentStep,
  className,
  children,
  ...props
}: React.ComponentProps<"ol"> & { currentStep?: number }) {
  return (
    <ProcessingStepContext.Provider value={{ currentStep }}>
      <ol
        data-slot="processing-step"
        className={cn(
          "flex w-full items-start justify-between gap-0",
          className
        )}
        aria-label="Étapes de traitement"
        {...props}
      >
        {/* Interleave items with connector lines */}
        {React.Children.map(children, (child, index) => {
          const isLast =
            index === React.Children.count(children) - 1

          // Derive connector state from the previous item's status
          // We pass index down so the connector knows if source step is completed
          return (
            <React.Fragment key={index}>
              {child}
              {!isLast && (
                <ConnectorLine sourceIndex={index} currentStep={currentStep} />
              )}
            </React.Fragment>
          )
        })}
      </ol>
    </ProcessingStepContext.Provider>
  )
} as ProcessingStepComponent

ProcessingStep.Item = ProcessingStepItem

// ---------------------------------------------------------------------------
// ConnectorLine (internal)
// ---------------------------------------------------------------------------

function ConnectorLine({
  sourceIndex,
  currentStep,
}: {
  sourceIndex: number
  currentStep: number | undefined
}) {
  // sourceIndex is 0-based; step numbers are 1-based
  // The connector after step N is completed if step N+1 is done, i.e. currentStep > sourceIndex + 1
  const isCompleted =
    currentStep !== undefined && currentStep > sourceIndex + 1

  return (
    <div
      aria-hidden
      className="mt-[1.375rem] flex-1 self-start px-1"
    >
      <div
        className={cn(
          "h-0.5 w-full transition-colors motion-reduce:transition-none",
          isCompleted
            ? "bg-primary"
            : "border-t-2 border-dashed border-border bg-transparent"
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { ProcessingStep, ProcessingStepItem }
export type { StepStatus }
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Lint**

Run: `bun run lint`
Expected: no errors

**Step 4: Commit**

```bash
git add components/processing-step.tsx
git commit -m "feat: add ProcessingStep compound component"
```

---

### Task 3: Documentation file

**Files:**
- Create: `components/processing-step.md`

**Step 1: Create the doc file**

```markdown
# ProcessingStep

Horizontal workflow stepper with four step states: `waiting`, `active`, `completed`, `error`.

## Usage

### Controlled by `currentStep`

\`\`\`tsx
import { ProcessingStep } from "@/components/processing-step"
import { File01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

<ProcessingStep currentStep={2}>
  <ProcessingStep.Item
    step={1}
    label="Import"
    icon={<HugeiconsIcon icon={File01Icon} />}
  />
  <ProcessingStep.Item step={2} label="Validation" />
  <ProcessingStep.Item step={3} label="Traitement" />
  <ProcessingStep.Item step={4} label="Terminé" />
</ProcessingStep>
\`\`\`

### With explicit status (for errors)

\`\`\`tsx
<ProcessingStep>
  <ProcessingStep.Item step={1} status="completed" label="Import" />
  <ProcessingStep.Item step={2} status="error" label="Validation" />
  <ProcessingStep.Item step={3} status="waiting" label="Traitement" />
</ProcessingStep>
\`\`\`

## Props

### `ProcessingStep`

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentStep` | `number` | — | Active step index (1-based). Drives status derivation. |

### `ProcessingStep.Item`

| Prop | Type | Required | Description |
|---|---|---|---|
| `step` | `number` | Yes | Step index (1-based) |
| `label` | `string` | Yes | Label below the indicator |
| `icon` | `ReactNode` | No | Icon above the indicator (e.g. `<HugeiconsIcon icon={...} />`) |
| `status` | `StepStatus` | No | Override derived status. Takes priority over `currentStep`. |

## States

| Status | Visual |
|---|---|
| `waiting` | Empty bordered circle, muted text |
| `active` | Filled primary circle with spinner, medium text |
| `completed` | Filled primary circle with checkmark |
| `error` | Filled destructive circle with ✕ |

## Accessibility

- Root renders as `<ol>` with `aria-label`
- Active item has `aria-current="step"`
- Decorative elements are `aria-hidden`
```

**Step 2: Commit**

```bash
git add components/processing-step.md
git commit -m "docs: add ProcessingStep usage documentation"
```

---

### Task 4: Visual verification in dev server

**Step 1: Add a demo to the example page**

Open `components/component-example.tsx` (or whichever page is used for component demos) and add:

```tsx
import { ProcessingStep } from "@/components/processing-step"
import { Upload01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

// Inside the page/component:
<div className="space-y-8 p-8">
  {/* Step 2 active */}
  <ProcessingStep currentStep={2}>
    <ProcessingStep.Item step={1} label="Import" icon={<HugeiconsIcon icon={Upload01Icon} />} />
    <ProcessingStep.Item step={2} label="Validation" />
    <ProcessingStep.Item step={3} label="Traitement" />
    <ProcessingStep.Item step={4} label="Terminé" />
  </ProcessingStep>

  {/* Error state */}
  <ProcessingStep>
    <ProcessingStep.Item step={1} status="completed" label="Import" />
    <ProcessingStep.Item step={2} status="error" label="Validation" />
    <ProcessingStep.Item step={3} status="waiting" label="Traitement" />
  </ProcessingStep>

  {/* All completed */}
  <ProcessingStep currentStep={5}>
    <ProcessingStep.Item step={1} label="Import" />
    <ProcessingStep.Item step={2} label="Validation" />
    <ProcessingStep.Item step={3} label="Traitement" />
    <ProcessingStep.Item step={4} label="Terminé" />
  </ProcessingStep>
</div>
```

**Step 2: Start dev server**

Run: `bun run dev`
Open: `http://localhost:34000`

**Step 3: Verify visually**
- Step 1 (completed): filled primary circle, checkmark, solid connector after it
- Step 2 (active): filled primary circle, spinner animating, dashed connector after it
- Steps 3–4 (waiting): empty bordered circle, muted text, dashed connectors
- Error step: filled destructive circle, ✕ icon, destructive label color
- Optional icon appears above the indicator with correct color tinting

**Step 4: Build check**

Run: `bun run build`
Expected: ✓ Compiled successfully, 0 errors

**Step 5: Commit demo if kept, or revert**

```bash
# If demo is to be kept:
git add components/component-example.tsx
git commit -m "chore: add ProcessingStep demo to component example"

# If demo is temporary:
git checkout -- components/component-example.tsx
```
