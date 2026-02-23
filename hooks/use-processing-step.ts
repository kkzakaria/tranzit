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
