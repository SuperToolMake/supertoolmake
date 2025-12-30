<script lang="ts">
  import ConfirmDialog from "@/components/common/ConfirmDialog.svelte"
  import UpdateAppForm from "@/components/common/UpdateAppForm.svelte"
  import RevertModal from "@/components/deploy/RevertModal.svelte"
  import VersionModal from "@/components/deploy/VersionModal.svelte"
  import ExportAppModal from "@/components/start/ExportAppModal.svelte"
  import ImportAppModal from "@/components/start/ImportAppModal.svelte"
  import { appStore, deploymentStore, isOnlyUser } from "@/stores/builder"
  import { admin } from "@/stores/portal/admin"
  import {
    Body,
    Button,
    Divider,
    Heading,
    Icon,
    Layout,
    Modal,
  } from "@budibase/bbui"

  let versionModal: VersionModal
  let exportModal: Modal
  let importModal: Modal
  let exportPublishedVersion: boolean = false
  let unpublishModal: ConfirmDialog
  let revertModal: RevertModal

  $: updateAvailable = $appStore.upgradableVersion !== $appStore.version
  $: revertAvailable = $appStore.revertableVersion != null

  const exportApp = (opts: { published: any }) => {
    exportPublishedVersion = !!opts?.published
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
      <Button secondary on:click={revertModal?.show}>Revert changes</Button>
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
  <Divider noMargin id="version" />
  <Layout gap="XS" noPadding>
    <Heading size="S">Client version</Heading>
    {#if $admin.isDev}
      <Body size="S">
        You're running the latest client version from your file system, as
        you're in developer mode.
        <br />
        Use the flag DEV_USE_CLIENT_FROM_STORAGE to load from minio instead.
      </Body>
    {:else if updateAvailable}
      <Body size="S">
        The workspace is currently using version
        <strong>{$appStore.version}</strong>
        but version <strong>{$appStore.upgradableVersion}</strong> is available.
        <br />
        Updates can contain new features, performance improvements and bug fixes.
      </Body>
      <div class="buttons">
        <Button
          cta
          on:click={versionModal.show}
          disabled={!$isOnlyUser}
          tooltip={$isOnlyUser
            ? null
            : "Unavailable - another user is editing this workspace"}
        >
          Update version
        </Button>
      </div>
    {:else if $admin.isDev}
      <Body size="S">
        <strong> Dev mode is enabled.</strong>
        <br />
        The workspace is currently using the latest version, but you can load your
        local changes.
      </Body>
      <div class="buttons">
        <Button
          cta
          on:click={versionModal.show}
          disabled={!$isOnlyUser}
          tooltip={$isOnlyUser
            ? null
            : "Unavailable - another user is editing this app"}
        >
          Publish local changes
        </Button>
      </div>
    {:else}
      <Body size="S">
        The workspace is currently using version
        <strong>{$appStore.version}</strong>.
        <br />
        You're running the latest!
      </Body>
      {#if revertAvailable}
        <div class="buttons">
          <Button
            secondary
            on:click={versionModal.show}
            disabled={!$isOnlyUser}
            tooltip={$isOnlyUser
              ? null
              : "Unavailable - another user is editing this workspace"}
          >
            Revert version
          </Button>
        </div>
      {/if}
    {/if}
  </Layout>
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

<VersionModal bind:this={versionModal} hideIcon={true} />

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

<RevertModal bind:this={revertModal} />

<style>
  .row {
    display: flex;
    gap: var(--spacing-m);
  }
  .buttons {
    margin-top: var(--spacing-xl);
  }
</style>
