<script lang="ts">
import { Body, ModalContent, notifications } from "@supertoolmake/bbui"
import type { APIClient } from "@supertoolmake/frontend-core"
import { resolveTranslationGroup } from "@supertoolmake/shared-core"
import { createEventDispatcher } from "svelte"
import PasswordRepeatInput from "./PasswordRepeatInput.svelte"

export let API: APIClient
export let passwordMinLength: string | undefined = undefined
export let notifySuccess = notifications.success
export let notifyError = notifications.error
// Get the default translations for the password modal and derive a type from it.
// `labels` can override any subset of these defaults while keeping type safety.
const DEFAULT_LABELS = resolveTranslationGroup("passwordModal")
type PasswordModalLabels = typeof DEFAULT_LABELS

export let labels: Partial<PasswordModalLabels> = {}

const dispatch = createEventDispatcher()

const updatePassword = async () => {
  try {
    await API.updateSelf({ password })
    notifySuccess(resolvedLabels.successText)
    dispatch("save")
  } catch {
    notifyError(resolvedLabels.errorText)
  }
}

const handleKeydown = (evt: KeyboardEvent) => {
  if (evt.key === "Enter" && !error && password) {
    updatePassword()
  }
}

$: resolvedLabels = {
  ...DEFAULT_LABELS,
  ...labels,
} as PasswordModalLabels

let password: string = ""
let error: string = ""
</script>

<svelte:window on:keydown={handleKeydown} />
<ModalContent
  title={resolvedLabels.title}
  confirmText={resolvedLabels.saveText}
  cancelText={resolvedLabels.cancelText}
  onConfirm={updatePassword}
  disabled={!!error || !password}
>
  <Body size="S">{resolvedLabels.body}</Body>
  <PasswordRepeatInput
    bind:password
    bind:error
    minLength={passwordMinLength}
    labels={resolvedLabels}
  />
</ModalContent>
