# ProcessingStep — Pill Redesign Design Document

Date: 2026-02-23

## Context

Redesign the `ProcessingStep` component from a vertical layout (icon above circle above label) to a compact horizontal pill layout (icon + label side by side inside a rounded pill). Goal: reduce vertical space used by the component.

## Layout

```
[⬆ Upload] ──────── [✓ Validation] ──────── [⚙ Traitement] ──── [✓ Terminé]
```

Each step is a pill (`<li>`) containing icon + label. Pills are connected by `flex-1` horizontal lines.

## Pill anatomy

```
<li class="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
  <icon class="size-3.5" />
  <span>Label</span>
</li>
```

## States

| State | Background | Text | Icon displayed |
|---|---|---|---|
| `waiting` | `bg-muted` | `text-muted-foreground` | Business icon (prop `icon`) |
| `active` | `bg-primary` | `text-primary-foreground` | `Loading03Icon` (spinner, animated) |
| `completed` | `bg-green-600` | `text-white` | `CheckmarkCircle02Icon` |
| `error` | `bg-destructive` | `text-destructive-foreground` | `Cancel01Icon` |

Icon size: `size-3.5` inside a `[&>svg]:size-3.5` span.

## Connector lines

Same as before: `flex-1 border-t-2`, solid `border-green-600` when the step to the left is completed, dashed `border-border` otherwise. Positioning: `self-center` (no margin offset needed — pills are all on the same baseline).

## API surface

Unchanged. Props on `ProcessingStep.Item`: `step`, `label`, `icon`, `status`, `className`, `...li props`. Props on `ProcessingStep`: `currentStep`, `aria-label`, `...ol props`.

The `icon` prop meaning shifts slightly: it is now the business icon shown only in the `waiting` state. For `active`, `completed`, and `error` states, the status icon replaces it.

## Files changed

- Modify: `components/processing-step.tsx` — restructure `ProcessingStepItem` layout and color maps, update `ConnectorLine` positioning
- Modify: `components/processing-step.md` — update States table, Accessibility section, and usage examples to reflect new pill layout
