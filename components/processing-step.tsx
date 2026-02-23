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
// Color maps (module-level to avoid recreation on every render)
// ---------------------------------------------------------------------------

const INDICATOR_COLORS: Record<StepStatus, string> = {
  waiting: "border-border bg-background text-muted-foreground",
  active: "border-primary bg-primary text-primary-foreground",
  completed: "border-primary bg-primary text-primary-foreground",
  error: "border-destructive bg-destructive text-destructive-foreground",
}

const LABEL_COLORS: Record<StepStatus, string> = {
  waiting: "text-muted-foreground",
  active: "text-foreground font-medium",
  completed: "text-foreground",
  error: "text-destructive",
}

const ICON_COLORS: Record<StepStatus, string> = {
  waiting: "text-muted-foreground",
  active: "text-primary",
  completed: "text-primary",
  error: "text-destructive",
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

  return (
    <li
      data-slot="processing-step-item"
      data-status={status}
      aria-current={status === "active" ? "step" : undefined}
      className={cn("flex flex-col items-center gap-1.5", className)}
      {...props}
    >
      {/* Optional icon above indicator */}
      <div className={cn("flex h-4 items-center justify-center", ICON_COLORS[status])}>
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
          INDICATOR_COLORS[status]
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
      <span className={cn("text-xs transition-colors motion-reduce:transition-none", LABEL_COLORS[status])}>
        {label}
      </span>
    </li>
  )
}

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
  // The connector after step N is completed if currentStep > sourceIndex + 1
  const isCompleted =
    currentStep !== undefined && currentStep > sourceIndex + 1

  return (
    <div
      aria-hidden
      className="mt-[35px] flex-1 self-start px-1"
    >
      <div
        className={cn(
          "h-0 w-full border-t-2 transition-colors motion-reduce:transition-none",
          isCompleted ? "border-primary" : "border-dashed border-border"
        )}
      />
    </div>
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
  "aria-label": ariaLabel = "Étapes de traitement",
  ...props
}: React.ComponentProps<"ol"> & { currentStep?: number }) {
  const childCount = React.Children.count(children)

  return (
    <ProcessingStepContext.Provider value={{ currentStep }}>
      <ol
        data-slot="processing-step"
        className={cn(
          "flex w-full items-start justify-between gap-0",
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          const isLast = index === childCount - 1
          const stepKey =
            React.isValidElement(child) && typeof (child.props as { step?: number }).step === "number"
              ? (child.props as { step: number }).step
              : index

          return (
            <React.Fragment key={stepKey}>
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
// Exports
// ---------------------------------------------------------------------------

export { ProcessingStep, ProcessingStepItem }
export type { StepStatus }
