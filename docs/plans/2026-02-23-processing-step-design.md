# ProcessingStep — Design Document

Date: 2026-02-23

## Context

Workflow stepper showing sequential processing steps with four distinct states. Used for multi-step business workflows where the parent controls progression.

## Files

- `components/processing-step.tsx` — compound component (`"use client"`)
- `hooks/use-processing-step.ts` — context, hook, and types
- `components/processing-step.md` — usage documentation

## API

### ProcessingStep (root)

| Prop | Type | Required | Description |
|---|---|---|---|
| `currentStep` | `number` | No | Drives automatic status derivation for all items |
| `className` | `string` | No | Additional classes on the root wrapper |
| `children` | `ReactNode` | Yes | `ProcessingStep.Item` elements |

### ProcessingStep.Item

| Prop | Type | Required | Description |
|---|---|---|---|
| `step` | `number` | Yes | Step index (1-based) |
| `label` | `string` | Yes | Label displayed below the indicator |
| `icon` | `ReactNode` | No | Optional icon displayed above the indicator |
| `status` | `StepStatus` | No | Explicit status — overrides derived status from `currentStep` |
| `className` | `string` | No | Additional classes on the item wrapper |

### StepStatus type

```ts
type StepStatus = "waiting" | "active" | "completed" | "error"
```

### Usage example

```tsx
// Simple: parent drives via currentStep
<ProcessingStep currentStep={2}>
  <ProcessingStep.Item step={1} label="Import" icon={<File01Icon />} />
  <ProcessingStep.Item step={2} label="Validation" icon={<CheckmarkIcon />} />
  <ProcessingStep.Item step={3} label="Traitement" />
  <ProcessingStep.Item step={4} label="Terminé" />
</ProcessingStep>

// With explicit error state on one step
<ProcessingStep>
  <ProcessingStep.Item step={1} status="completed" label="Import" />
  <ProcessingStep.Item step={2} status="error" label="Validation" />
  <ProcessingStep.Item step={3} status="waiting" label="Traitement" />
</ProcessingStep>
```

## Visual Design

### Layout

Horizontal bar. Items connected by a line. Labels below indicators. Optional icons above indicators.

```
    [icon?]      [icon?]      [icon?]      [icon?]
      ●  ─────── ◉  ─────── ○  ─────── ○
   Étape 1    Étape 2    Étape 3    Étape 4
  completed    active    waiting   waiting
```

### State indicators

| State | Indicator | Color token | Icon inside |
|---|---|---|---|
| `waiting` | Empty circle (border only) | `muted-foreground` / `border` | — |
| `active` | Filled circle | `primary` | Spinning loader (animated) |
| `completed` | Filled circle | `primary` | Checkmark |
| `error` | Filled circle | `destructive` | ✕ |

### Connector line

- Solid line between steps when the source step is `completed`
- Dashed/muted line otherwise

### Optional icon (above indicator)

- `text-xs`, sized to match Hugeicons small variant
- Color adapts to the step's status (muted for waiting, primary for active/completed, destructive for error)

### Animations

- Spinner on `active` state uses CSS animation
- `motion-reduce:` variant applied on all animations (project convention)

## Data Flow

- `ProcessingStepContext` provides `{ currentStep, totalSteps }` to all children
- Each `Item` derives its status:
  - If `status` prop is provided explicitly → use it
  - Else if `step < currentStep` → `completed`
  - Else if `step === currentStep` → `active`
  - Else → `waiting`
- No internal state — the parent owns all progression logic

## Patterns

- Follows compound component pattern: `Context provider` + sub-components with `data-slot` attributes
- Hook `use-processing-step.ts` exports context, provider-value type, and consumer hook
- Companion `processing-step.md` documents usage and examples
- Accessible: `role="list"` on root, `role="listitem"` + `aria-current="step"` on active item, `aria-label` on indicators
