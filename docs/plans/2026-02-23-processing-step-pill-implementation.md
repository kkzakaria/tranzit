# ProcessingStep Pill Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `ProcessingStep.Item` from a vertical 3-part layout (icon / circle / label) to a compact horizontal pill (icon + label side by side), reducing the component's vertical footprint.

**Architecture:** Replace the three stacked elements in `ProcessingStepItem` with a single `<li>` pill. Merge `INDICATOR_COLORS`, `LABEL_COLORS`, `ICON_COLORS` into one `PILL_COLORS` map. Update `ConnectorLine` positioning from `self-start mt-[35px]` to `self-center`. Update `processing-step.md` to reflect the new visual design. No API changes — props are identical.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, `@hugeicons/react`, `@hugeicons/core-free-icons`, `cn()` from `@/lib/utils`.

---

### Task 1: Rewrite `ProcessingStepItem` as a pill

**Files:**
- Modify: `components/processing-step.tsx`

**Step 1: Replace the three color maps with one `PILL_COLORS` map**

In `components/processing-step.tsx`, find the color maps section (lines 40–59) and replace the three `const` declarations with:

```tsx
// ---------------------------------------------------------------------------
// Color map (module-level to avoid recreation on every render)
// ---------------------------------------------------------------------------

const PILL_COLORS: Record<StepStatus, string> = {
  waiting: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-green-600 text-white",
  error: "bg-destructive text-destructive-foreground",
}
```

**Step 2: Rewrite `ProcessingStepItem`**

Replace the entire `ProcessingStepItem` function body (lines 65–127) with:

```tsx
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

  return (
    <li
      data-slot="processing-step-item"
      data-status={status}
      aria-current={status === "active" ? "step" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors motion-reduce:transition-none",
        PILL_COLORS[status],
        className
      )}
      {...props}
    >
      {(status !== "waiting" || icon) && (
        <span className="[&>svg]:size-3.5" aria-hidden>
          {status === "active" && (
            <HugeiconsIcon
              icon={Loading03Icon}
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {status === "completed" && (
            <HugeiconsIcon icon={CheckmarkCircle02Icon} />
          )}
          {status === "error" && (
            <HugeiconsIcon icon={Cancel01Icon} />
          )}
          {status === "waiting" && icon}
        </span>
      )}
      <span>{label}</span>
    </li>
  )
}
```

Key points:
- The icon span is only rendered when there is something to show (status icon OR a business icon in waiting state) — avoids an empty flex child that would create a spurious gap.
- `shrink-0` prevents the pill from collapsing when the `<ol>` is tight.
- `transition-colors motion-reduce:transition-none` preserves the accessibility animation preference.

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

**Step 4: Commit**

```bash
git add components/processing-step.tsx
git commit -m "feat: redesign ProcessingStep.Item as horizontal pill"
```

---

### Task 2: Update `ConnectorLine` positioning

**Files:**
- Modify: `components/processing-step.tsx`

Pills are all on the same horizontal axis. The connector no longer needs the `self-start mt-[35px]` offset that was calculated for the old vertical layout.

**Step 1: Replace the connector wrapper `className`**

Find `ConnectorLine` (lines 133–158). Change the outer `<div>` className from:

```tsx
className="mt-[35px] flex-1 self-start px-1"
```

to:

```tsx
className="flex-1 self-center px-1"
```

The full updated `ConnectorLine`:

```tsx
function ConnectorLine({
  sourceIndex,
  currentStep,
}: {
  sourceIndex: number
  currentStep: number | undefined
}) {
  // sourceIndex is 0-based; step numbers are 1-based
  // The connector after step N is completed if currentStep > sourceIndex + 1
  const isCompleted =
    currentStep !== undefined && currentStep > sourceIndex + 1

  return (
    <div
      aria-hidden
      className="flex-1 self-center px-1"
    >
      <div
        className={cn(
          "h-0 w-full border-t-2 transition-colors motion-reduce:transition-none",
          isCompleted ? "border-green-600" : "border-dashed border-border"
        )}
      />
    </div>
  )
}
```

**Step 2: Update `<ol>` className on the root**

The root `<ol>` currently uses `items-start justify-between`. With pills, `items-center` is correct and `justify-between` is no longer needed (connectors fill the space with `flex-1`):

Find (around line 183):
```tsx
"flex w-full items-start justify-between gap-0",
```

Replace with:
```tsx
"flex w-full items-center gap-0",
```

**Step 3: Type-check and lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: zero errors

**Step 4: Commit**

```bash
git add components/processing-step.tsx
git commit -m "fix: center connector lines between pills, update ol alignment"
```

---

### Task 3: Update `processing-step.md` documentation

**Files:**
- Modify: `components/processing-step.md`

**Step 1: Update the States table**

Find the States section and replace with:

```markdown
## States

| Status | Visual |
|---|---|
| `waiting` | Gray pill (`bg-muted`), business icon (if provided), muted text |
| `active` | Primary pill, spinner replaces business icon, primary-foreground text |
| `completed` | Green pill (`bg-green-600`), checkmark replaces business icon, white text |
| `error` | Destructive pill, ✕ replaces business icon, destructive-foreground text |
```

**Step 2: Update the Accessibility section**

Find:
```markdown
- Indicator circle and connectors are `aria-hidden`; icons are wrapped in a presentational `<span>` and inherit the same treatment
```

Replace with:
```markdown
- Connectors are `aria-hidden`; status and business icons are wrapped in a presentational `aria-hidden` `<span>`
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors (docs don't affect compilation, but good habit)

**Step 4: Commit**

```bash
git add components/processing-step.md
git commit -m "docs: update ProcessingStep docs to reflect pill layout"
```

---

### Task 4: Visual verification

**Step 1: Open the demo page**

Dev server is already running on port 34000. Open:
`http://localhost:34000/fr/demo/processing-step`

**Step 2: Verify initial state (step 1 active)**

- Step 1 pill: primary background, spinner icon, label "Upload"
- Steps 2–4 pills: gray background, business icons (Validation: checkmark icon, Traitement: settings icon, Terminé: checkmark icon)
- Connectors: all dashed

**Step 3: Advance to step 2 (click Suivant)**

- Step 1 pill: green background, checkmark icon, label "Upload"
- Connector after step 1: solid green
- Step 2 pill: primary background, spinner, label "Validation"
- Steps 3–4: gray, business icons

**Step 4: Simulate error (click "Simuler une erreur")**

- Current step pill: destructive background, ✕ icon
- "Suivant" button disabled

**Step 5: Reset error and advance through all steps**

- After step 4 → Suivant: all pills green, all connectors solid green

**Step 6: Check reduced vertical footprint**

The component should occupy significantly less vertical space than before (no icon row + circle + label stacked vertically — just a single pill row).

**Step 7: Commit if no fixes needed**

```bash
git add -p  # stage any fixes made during visual check
git commit -m "fix: <description of any visual fixes>"
```

Or if no changes needed, no commit required.
