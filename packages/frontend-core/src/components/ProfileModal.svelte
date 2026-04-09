<script lang="ts">
import { Body, Input, ModalContent, notifications } from "@supertoolmake/bbui"
import type { APIClient } from "@supertoolmake/frontend-core"
import { resolveTranslationGroup } from "@supertoolmake/shared-core"
import type { ContextUser, User } from "@supertoolmake/types"
import { createEventDispatcher } from "svelte"
import { writable } from "svelte/store"

export let user: User | ContextUser | undefined = undefined
export let API: APIClient
export let notifySuccess = notifications.success
export let notifyError = notifications.error
const DEFAULT_LABELS = resolveTranslationGroup("profileModal")
type ProfileModalLabels = typeof DEFAULT_LABELS

export let labels: Partial<ProfileModalLabels> = {}

const dispatch = createEventDispatcher()

const updateInfo = async () => {
  try {
    await API.updateSelf($values)
    notifySuccess(resolvedLabels.successText)
    dispatch("save")
  } catch (error) {
    console.error(error)
    notifyError(resolvedLabels.errorText)
  }
}

$: resolvedLabels = {
  ...DEFAULT_LABELS,
  ...labels,
} as ProfileModalLabels

const values = writable({
  firstName: user?.firstName,
  lastName: user?.lastName,
})
</script>

<ModalContent
  title={resolvedLabels.title}
  confirmText={resolvedLabels.saveText}
  cancelText={resolvedLabels.cancelText}
  onConfirm={updateInfo}
>
  <Body size="S">
    {resolvedLabels.body}
  </Body>
  <Input disabled value={user?.email || ""} label={resolvedLabels.emailLabel} />
  <Input bind:value={$values.firstName} label={resolvedLabels.firstNameLabel} />
  <Input bind:value={$values.lastName} label={resolvedLabels.lastNameLabel} />
</ModalContent>
