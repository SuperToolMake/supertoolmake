<script>
import { ActionButton, Helpers, Layout, Modal, Table } from "@supertoolmake/bbui"
import { createEventDispatcher } from "svelte"
import AuthTypeRenderer from "./AuthTypeRenderer.svelte"
import RestAuthenticationModal from "./RestAuthenticationModal.svelte"

export let authConfigs = []

const openConfigModal = (config) => {
  currentConfig = config
  modal.show()
}

const onConfirm = (config) => {
  let newAuthConfigs

  if (currentConfig) {
    newAuthConfigs = normalizedAuthConfigs.map((c) => {
      // replace the current config with the new one
      if (c._id === currentConfig._id) {
        return config
      }
      return c
    })
  } else {
    config._id = Helpers.uuid()
    newAuthConfigs = [...normalizedAuthConfigs, config]
  }

  dispatch("change", newAuthConfigs)
}

const onRemove = () => {
  const newAuthConfigs = normalizedAuthConfigs.filter((c) => {
    return c._id !== currentConfig._id
  })

  dispatch("change", newAuthConfigs)
}

$: normalizedAuthConfigs = authConfigs ?? []

const dispatch = createEventDispatcher()
let currentConfig = null
let modal

const schema = {
  name: "",
  type: "",
}
</script>

<Modal bind:this={modal}>
  <RestAuthenticationModal
    configs={normalizedAuthConfigs}
    {currentConfig}
    {onConfirm}
    {onRemove}
  />
</Modal>

<Layout gap="S" noPadding>
  {#if normalizedAuthConfigs && normalizedAuthConfigs.length > 0}
    <Table
      on:click={({ detail }) => openConfigModal(detail)}
      {schema}
      data={normalizedAuthConfigs}
      allowEditColumns={false}
      allowEditRows={false}
      allowSelectRows={false}
      customRenderers={[{ column: "type", component: AuthTypeRenderer }]}
    />
  {/if}
  <div>
    <ActionButton on:click={() => openConfigModal()} icon="plus"
      >Add authentication</ActionButton
    >
  </div>
</Layout>
