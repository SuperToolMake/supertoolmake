<script lang="ts">
import { Body, Button, Divider, Heading, Icon, Layout, Modal } from "@supertoolmake/bbui"
import ConfirmDialog from "@/components/common/ConfirmDialog.svelte"
import UpdateAppForm from "@/components/common/UpdateAppForm.svelte"
import ExportAppModal from "@/components/start/ExportAppModal.svelte"
import ImportAppModal from "@/components/start/ImportAppModal.svelte"
import { appStore, deploymentStore } from "@/stores/builder"

let exportModal: Modal
let importModal: Modal
let exportPublishedVersion: boolean = false
let unpublishModal: ConfirmDialog

const exportApp = (opts: { published: any }) => {
  exportPublishedVersion = Boolean(opts?.published)
  exportModal.show()
}
</script>

<Layout noPadding>
  <Heading size="S">Workspace info</Heading>
  <UpdateAppForm />
  {#if $deploymentStore.isPublished}
    <Divider noMargin />
    <Heading size="S">Deployment</Heading>
    <div class="row top">
      <Icon
        name="check-circle"
        color="var(--spectrum-global-color-green-400)"
        size="L"
      />
      <Body size="S">
        {$deploymentStore.lastPublished}
      </Body>
    </div>
    <div class="row">
      <Button warning on:click={unpublishModal?.show}>Unpublish</Button>
    </div>
  {:else}
    <div class="row">
      <Icon
        name="warning"
        color="var(--spectrum-global-color-yellow-400)"
        size="M"
      />
      <Body size="S">
        You haven't published yet, so your apps and automations are not
        available to users
      </Body>
    </div>
    <div class="row">
      <Button
        icon="arrow-circle-up"
        primary
        disabled={$deploymentStore.isPublishing}
        on:click={() => deploymentStore.publishApp()}
      >
        Publish
      </Button>
    </div>
  {/if}
  <Divider noMargin />
  <Layout noPadding gap="XS">
    <Heading size="XS">Export</Heading>
    <Body size="S">
      Export your workspace for backup or to share it with someone else
    </Body>
  </Layout>
  <div class="row">
    <Button secondary on:click={() => exportApp({ published: false })}>
      Export latest edited workspace
    </Button>
    <Button
      secondary
      disabled={!$deploymentStore.isPublished}
      on:click={() => exportApp({ published: true })}
    >
      Export latest published workspace
    </Button>
  </div>
  <Divider noMargin />
  <Layout noPadding gap="XS">
    <Heading size="S">Import</Heading>
    <Body size="S">Import an export bundle to update this workspace</Body>
  </Layout>
  <div class="row">
    <Button secondary on:click={importModal?.show}>Import workspace</Button>
  </div>
</Layout>

<Modal bind:this={exportModal}>
  <ExportAppModal appId={$appStore.appId} published={exportPublishedVersion} />
</Modal>

<Modal bind:this={importModal}>
  <ImportAppModal app={$appStore} />
</Modal>

<ConfirmDialog
  bind:this={unpublishModal}
  title="Confirm unpublish"
  okText="Unpublish"
  onOk={deploymentStore.unpublishApp}
>
  Are you sure you want to unpublish the workspace
  <b>{$appStore.name}</b>?

  <p>This will make all apps and automations in this workspace unavailable</p>
</ConfirmDialog>

<style>
  .row {
    display: flex;
    gap: var(--spacing-m);
  }
  .buttons {
    margin-top: var(--spacing-xl);
  }
</style>
