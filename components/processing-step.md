# ProcessingStep

Horizontal workflow stepper with four step states: `waiting`, `active`, `completed`, `error`.

## Usage

### Controlled by `currentStep`

```tsx
import { ProcessingStep } from "@/components/processing-step"
import { File01Icon } from "@hugeicons/core-free-icons"
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
```

### With explicit status (for errors)

```tsx
<ProcessingStep>
  <ProcessingStep.Item step={1} status="completed" label="Import" />
  <ProcessingStep.Item step={2} status="error" label="Validation" />
  <ProcessingStep.Item step={3} status="waiting" label="Traitement" />
</ProcessingStep>
```

## Props

### `ProcessingStep`

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentStep` | `number` | — | Active step index (1-based). Drives status derivation for all items. |
| `aria-label` | `string` | `"Étapes de traitement"` | Accessible label for the step list. Override per locale. |

### `ProcessingStep.Item`

| Prop | Type | Required | Description |
|---|---|---|---|
| `step` | `number` | Yes | Step index (1-based) |
| `label` | `string` | Yes | Label displayed below the indicator |
| `icon` | `ReactNode` | No | Icon displayed above the indicator (e.g. `<HugeiconsIcon icon={...} />`) |
| `status` | `StepStatus` | No | Explicit status — overrides derivation from `currentStep`. |

## States

| Status | Visual |
|---|---|
| `waiting` | Empty bordered circle, muted text |
| `active` | Filled primary circle with spinner, medium-weight text |
| `completed` | Filled primary circle with checkmark |
| `error` | Filled destructive circle with ✕, destructive-colored text |

## Status derivation

When `currentStep` is set on the root and no explicit `status` is given on an item:

- `step < currentStep` → `completed`
- `step === currentStep` → `active`
- `step > currentStep` → `waiting`

An explicit `status` prop on `ProcessingStep.Item` always takes priority.

## Connector lines

The connector between two items is solid (`primary`) when the item to its left is completed, and dashed (`border`) otherwise.

> **Note:** Connector state is derived from `currentStep` on the root, not from the explicit `status` of adjacent items. If you mix `currentStep` and per-item `status` overrides, the connector may not reflect the visual state of the adjacent items.

## Accessibility

- Root renders as `<ol>` with `aria-label` (default: `"Étapes de traitement"`, override per locale via the `aria-label` prop)
- Active item has `aria-current="step"`
- Decorative elements (indicator circle, icons, connectors) are `aria-hidden`
- Spinner has `motion-reduce:animate-none` for vestibular accessibility
