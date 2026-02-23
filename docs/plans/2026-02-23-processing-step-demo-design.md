# ProcessingStep Demo Page — Design Document

Date: 2026-02-23

## Context

Interactive demo page for the `ProcessingStep` compound component. Follows the same pattern as `app/[locale]/demo/panel-layout/`. Scenario: file processing workflow (Upload → Validation → Traitement → Terminé).

## Files

### Created
- `app/[locale]/demo/processing-step/page.tsx` — RSC shell with `generateMetadata`
- `app/[locale]/demo/processing-step/_demo.tsx` — `"use client"` interactive demo

### Modified
- `components/app-sidebar.tsx` — add sidebar entry `/demo/processing-step`
- `messages/fr/navigation.json` — add `"processingStep"` key
- `messages/en/navigation.json` — add `"processingStep"` key
- `messages/ar/navigation.json` — add `"processingStep"` key
- `messages/zh/navigation.json` — add `"processingStep"` key

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Traitement de fichier                    [titre h1] │
│  Simulez les différents états du composant.          │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  [Upload]────[Validation]────[Traitement]────[Terminé]  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  État actuel : En cours — Validation               │
│  Description courte de l'étape active              │
│                                                     │
│  [← Précédent]  [Simuler une erreur]  [Suivant →] │
│                                                     │
│  ──────────────────────────────────────────────── │
│  debug info: step N/4 · status: active             │
└─────────────────────────────────────────────────────┘
```

## Steps definition

| Step | Label | Icon (Hugeicons) |
|---|---|---|
| 1 | Upload | `Upload04Icon` |
| 2 | Validation | `CheckmarkCircle02Icon` |
| 3 | Traitement | `Settings01Icon` |
| 4 | Terminé | `Tick02Icon` |

Each step has a short description displayed below the stepper when active.

## State

```ts
const [currentStep, setCurrentStep] = useState(1)
const [errorStep, setErrorStep] = useState<number | null>(null)
```

## Status derivation

Each `ProcessingStep.Item` receives an explicit `status` prop computed as:
- If `errorStep === step` → `"error"`
- If `step < currentStep` → `"completed"`
- If `step === currentStep` → `"active"`
- If `step > currentStep` → `"waiting"`

(Uses `ProcessingStep` without `currentStep` prop — all statuses passed explicitly.)

## Button behaviour

| Button | Enabled when | Action |
|---|---|---|
| Précédent | `currentStep > 1` | If `errorStep !== null`: reset error first. Else: `currentStep - 1` |
| Suivant | `currentStep < 4` AND no active error | `currentStep + 1`, clear `errorStep` |
| Simuler erreur | always | Toggle: if `errorStep === currentStep` → reset to null; else → set `errorStep = currentStep` |

When all 4 steps are completed (`currentStep > 4`), "Suivant" is disabled.

## i18n

Only the navigation key `processingStep` needs translation. The demo UI itself is in French (static strings, not translated) — consistent with `demo/panel-layout/page.tsx` which also uses hardcoded English strings.

## Sidebar

Add entry after `panelLayout`:
- href: `/demo/processing-step`
- icon: `StepOverIcon` (or `LayoutGridIcon`)
- translation key: `processingStep`
