# ProcessingStep

Horizontal workflow stepper with four step states: `waiting`, `active`, `completed`, `error`.

> **Client component:** `processing-step.tsx` is marked `"use client"`. Render it inside a Client Component subtree; accessing `ProcessingStep.Item` from a React Server Component will yield `undefined`.

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
| `...ol props` | `React.ComponentProps<"ol">` | — | All standard `<ol>` HTML attributes are forwarded to the root element. |

### `ProcessingStep.Item`

| Prop | Type | Required | Description |
|---|---|---|---|
| `step` | `number` | Yes | Step index (1-based) |
| `label` | `string` | Yes | Label displayed inside the pill, to the right of the icon. |
| `icon` | `ReactNode` | No | Icon rendered inside the pill, to the left of the label (e.g. `<HugeiconsIcon icon={...} />`). Shown only in the `waiting` state — replaced by the status icon (spinner, checkmark, ✕) for all other states. When omitted on a `waiting` item, no icon slot is rendered. |
| `status` | `StepStatus` | No | Explicit status — overrides derivation from `currentStep`. |
| `className` | `string` | No | Extra CSS classes merged onto the `<li>` element. |
| `...li props` | `Omit<React.ComponentProps<"li">, "children">` | — | All standard `<li>` HTML attributes (except `children`) are forwarded to the item element. |

## Exports

| Export | Kind | Description |
|---|---|---|
| `ProcessingStep` | Component | Root compound component. |
| `ProcessingStepItem` | Component | The underlying item component. `ProcessingStep.Item` is an alias for this export. |
| `StepStatus` | Type | `"waiting" \| "active" \| "completed" \| "error"` — useful for typing local state. |

```tsx
import { ProcessingStep } from "@/components/processing-step"
import type { StepStatus } from "@/components/processing-step"

const [status, setStatus] = React.useState<StepStatus>("waiting")
```

## States

| Status | Visual |
|---|---|
| `waiting` | Gray pill (`bg-muted`), business icon (if provided), muted text |
| `active` | Primary pill, spinner replaces business icon, primary-foreground text |
| `completed` | Green pill (`bg-green-600`), checkmark replaces business icon, white text |
| `error` | Destructive pill, ✕ replaces business icon, white text |

## Status derivation

When `currentStep` is set on the root and no explicit `status` is given on an item:

- `step < currentStep` → `completed`
- `step === currentStep` → `active`
- `step > currentStep` → `waiting`

If `currentStep` is omitted on the root, all items default to `"waiting"` unless they each receive an explicit `status` prop.

An explicit `status` prop on `ProcessingStep.Item` always takes priority.

## Connector lines

The connector between two items is solid green (`border-green-600`) when the item to its left is completed, and dashed (`border`) otherwise.

> **Note:** Connector state is derived from `currentStep` on the root, not from the explicit `status` of adjacent items. If you mix `currentStep` and per-item `status` overrides, the connector may not reflect the visual state of the adjacent items.

## Accessibility

- Root renders as `<ol>` with `aria-label` (default: `"Étapes de traitement"`, override per locale via the `aria-label` prop)
- Active item has `aria-current="step"`
- Connectors are `aria-hidden="true"`; status and business icons are wrapped in a presentational `<span aria-hidden="true">`
- Spinner has `motion-reduce:animate-none` for vestibular accessibility
