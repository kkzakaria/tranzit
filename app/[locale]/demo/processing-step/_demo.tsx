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
  DatabaseIcon,
  LockIcon,
  Mail01Icon,
  FileValidationIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { ProcessingStep } from "@/components/processing-step"
import type { StepStatus } from "@/components/processing-step"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface StepDef {
  label: string
  description: string
  icon: React.ReactElement
}

const STEPS: StepDef[] = [
  {
    label: "Upload",
    description: "Envoi du fichier vers le serveur.",
    icon: <HugeiconsIcon icon={UploadIcon} />,
  },
  {
    label: "Validation format",
    description: "Vérification du format et de l'intégrité du fichier.",
    icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} />,
  },
  {
    label: "Analyse",
    description: "Analyse et extraction des données brutes.",
    icon: <HugeiconsIcon icon={Settings01Icon} />,
  },
  {
    label: "Sécurité",
    description: "Contrôle antivirus et vérification des permissions.",
    icon: <HugeiconsIcon icon={LockIcon} />,
  },
  {
    label: "Indexation",
    description: "Indexation des données dans la base.",
    icon: <HugeiconsIcon icon={DatabaseIcon} />,
  },
  {
    label: "Vérification",
    description: "Contrôle de cohérence des données indexées.",
    icon: <HugeiconsIcon icon={FileValidationIcon} />,
  },
  {
    label: "Traitement",
    description: "Transformation et enrichissement des données.",
    icon: <HugeiconsIcon icon={Settings01Icon} />,
  },
  {
    label: "Notification",
    description: "Envoi du rapport de traitement par e-mail.",
    icon: <HugeiconsIcon icon={Mail01Icon} />,
  },
  {
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
  return STEPS[currentStep - 1]
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
        <ProcessingStep currentStep={currentStep}>
          {STEPS.map(({ label, icon }, index) => (
            <ProcessingStep.Item
              key={index + 1}
              step={index + 1}
              label={label}
              icon={icon}
              status={deriveItemStatus(index + 1, currentStep, errorStep)}
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
          disabled={currentStep <= 1 && !hasError}
          aria-label={hasError ? "Réinitialiser l'erreur" : "Étape précédente"}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} data-icon="inline-start" />
          Précédent
        </Button>

        <Button
          variant="outline"
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
              Erreur sur l&apos;étape{" "}
              <code className="font-mono">{errorStep}</code>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
