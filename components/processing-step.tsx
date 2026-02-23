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
// Color map (module-level to avoid recreation on every render)
// ---------------------------------------------------------------------------

const PILL_COLORS: Record<StepStatus, string> = {
  waiting: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-green-600 text-white",
  error: "bg-destructive text-white",
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
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors motion-reduce:transition-none",
        PILL_COLORS[status],
        className
      )}
      {...props}
    >
      {(status !== "waiting" || icon) && (
        <span className="[&>svg]:size-3.5" aria-hidden="true">
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
      aria-hidden="true"
      className="flex-1 self-center"
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
          "flex w-full items-center",
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
