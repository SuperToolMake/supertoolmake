import type { FieldSchema, FieldType, UIFieldValidationRule } from "@budibase/types"
import type { Readable } from "svelte/store"

export interface FormContext {
  formApi?: {
    registerField: (
      field: string,
      type: FieldType,
      defaultValue: string | string[] | undefined,
      disabled: boolean,
      readonly: boolean,
      validation: UIFieldValidationRule[] | undefined,
      formStep: number
    ) => Readable<FormField>
  }
  setStep: (step: number) => void
}

export interface FormField {
  fieldState: FieldState
  fieldApi: FieldApi
  fieldSchema: FieldSchema
}

export interface FieldApi {
  setValue(value: any): boolean
  deregister(): void
}

export interface FieldState<T = any> {
  value: T
  fieldId: string
  disabled: boolean
  readonly: boolean
  error?: string
}
