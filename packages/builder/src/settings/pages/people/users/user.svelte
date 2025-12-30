<script>
  import { goto } from "@roxi/routify"
  import {
    ActionMenu,
    Button,
    Layout,
    Heading,
    Body,
    Label,
    Icon,
    Input,
    MenuItem,
    Popover,
    Select,
    Modal,
    notifications,
    Banner,
    Table,
  } from "@budibase/bbui"
  import { onMount, getContext } from "svelte"
  import { users } from "@/stores/portal/users"
  import { auth } from "@/stores/portal/auth"
  import { appsStore } from "@/stores/portal/apps"
  import { roles } from "@/stores/builder"
  import ForceResetPasswordModal from "./_components/ForceResetPasswordModal.svelte"
  import DeleteUserModal from "./_components/DeleteUserModal.svelte"
  import { Constants, UserAvatar } from "@budibase/frontend-core"
  import AppNameTableRenderer from "./_components/AppNameTableRenderer.svelte"
  import AppRoleTableRenderer from "./_components/AppRoleTableRenderer.svelte"
  import { sdk } from "@budibase/shared-core"
  import ActiveDirectoryInfo from "../_components/ActiveDirectoryInfo.svelte"
  import { bb } from "@/stores/bb"

  $goto

  export let userId

  const routing = getContext("routing")

  // Override
  $: params = $routing?.params
  $: userId = params.userId
  $: if (params.userId && userId !== params.userId) {
    userId = params.userId
  }
  const appSchema = {
    name: {
      width: "2fr",
    },
    role: {
      width: "1fr",
      displayName: "Access",
    },
  }
  const customAppTableRenderers = [
    {
      column: "name",
      component: AppNameTableRenderer,
    },
    {
      column: "role",
      component: AppRoleTableRenderer,
    },
  ]

  let deleteModal
  let resetPasswordModal
  let popoverAnchor
  let searchTerm = ""
  let popover
  let user, tenantOwner
  let loaded = false
  let userFieldsToUpdate = {}

  $: isSSO = !!user?.provider
  $: isAdmin = sdk.users.isAdmin($auth.user)
  $: isScim = user?.scimInfo?.isSync
  $: readonly = !isAdmin || isScim
  $: privileged = sdk.users.isAdminOrGlobalBuilder(user)
  $: nameLabel = getNameLabel(user)
  $: availableApps = user
    ? getApps(user, sdk.users.userAppAccessList(user))
    : []
  $: globalRole = users.getUserRole(user)
  $: isTenantOwner = tenantOwner?.email && tenantOwner.email === user?.email

  const getApps = (user, appIds) => {
    let availableApps = $appsStore.apps
      .slice()
      .filter(app =>
        appIds.find(id => id === appsStore.getProdAppID(app.devId))
      )
    return availableApps.map(app => {
      const prodAppId = appsStore.getProdAppID(app.devId)
      return {
        name: app.name,
        devId: app.devId,
        icon: app.icon,
        role: getRole(prodAppId, user),
      }
    })
  }

  const getRole = (prodAppId, user) => {
    if (privileged) {
      return Constants.Roles.ADMIN
    }

    if (user?.builder?.apps?.includes(prodAppId)) {
      return Constants.Roles.CREATOR
    }

    if (user?.roles?.[prodAppId]) {
      return user.roles[prodAppId]
    }
  }

  const getNameLabel = user => {
    const { firstName, lastName, email } = user || {}
    if (!firstName && !lastName) {
      return email || ""
    }
    let label
    if (firstName) {
      label = firstName
      if (lastName) {
        label += ` ${lastName}`
      }
    } else {
      label = lastName
    }
    return label
  }

  async function saveUser() {
    try {
      await users.save({ ...user, ...userFieldsToUpdate })
      userFieldsToUpdate = {}
      await fetchUser()
    } catch (error) {
      notifications.error("Error updating user")
    }
  }

  async function updateUserFirstName(evt) {
    userFieldsToUpdate.firstName = evt.target.value
  }

  async function updateUserLastName(evt) {
    userFieldsToUpdate.lastName = evt.target.value
  }

  async function updateUserRole({ detail }) {
    let flags = {}
    if (detail === Constants.BudibaseRoles.Developer) {
      flags = { admin: { global: false }, builder: { global: true } }
    } else if (detail === Constants.BudibaseRoles.Admin) {
      flags = { admin: { global: true }, builder: { global: true } }
    } else if (detail === Constants.BudibaseRoles.AppUser) {
      flags = { admin: { global: false }, builder: { global: false } }
    } else if (detail === Constants.BudibaseRoles.Creator) {
      flags = {
        admin: { global: false },
        builder: {
          global: false,
          creator: true,
          apps: user?.builder?.apps || [],
        },
      }
    }
    userFieldsToUpdate = {
      ...userFieldsToUpdate,
      ...flags,
    }
  }

  async function fetchUser() {
    if (!userId) {
      notifications.error("Need a valid userId buddy")
      return
    }
    user = await users.get(userId)
    if (!user?._id) {
      bb.settings("/people/users")
    }
    tenantOwner = await users.getAccountHolder()
  }

  onMount(async () => {
    try {
      await Promise.all([fetchUser(), roles.fetch()])
      loaded = true
    } catch (error) {
      notifications.error("Error fetching users")
    }
  })
</script>

{#if loaded}
  <Layout gap="L" noPadding>
    <div class="title">
      <div class="user-info">
        <UserAvatar size="M" {user} showTooltip={false} />
        <div class="subtitle">
          <Heading size="XS">{nameLabel}</Heading>
          {#if nameLabel !== user?.email}
            <Body size="S">{user?.email}</Body>
          {/if}
        </div>
      </div>
      {#if userId !== $auth.user?._id && !readonly}
        <div>
          <ActionMenu align="right">
            <span slot="control">
              <Icon hoverable name="dots-three" />
            </span>
            {#if !isSSO}
              <MenuItem
                on:click={resetPasswordModal.show}
                icon="arrow-clockwise"
              >
                Force password reset
              </MenuItem>
            {/if}
            {#if !isTenantOwner}
              <MenuItem on:click={deleteModal.show} icon="trash">
                Delete
              </MenuItem>
            {/if}
          </ActionMenu>
        </div>
      {/if}
    </div>
    <Layout noPadding gap="S">
      <div class="details-title">
        <Heading size="XS">Details</Heading>
        {#if user?.scimInfo?.isSync}
          <ActiveDirectoryInfo text="User synced from your AD" />
        {/if}
      </div>
      <div class="fields">
        <div class="field">
          <Label size="L">Email</Label>
          <Input disabled value={user?.email} />
        </div>
        <div class="field">
          <Label size="L">First name</Label>
          <Input
            disabled={readonly}
            value={user?.firstName}
            on:input={updateUserFirstName}
          />
        </div>
        <div class="field">
          <Label size="L">Last name</Label>
          <Input
            disabled={readonly}
            value={user?.lastName}
            on:input={updateUserLastName}
          />
        </div>
        <!-- don't let a user remove the privileges that let them be here -->
        {#if userId !== $auth.user._id}
          <!-- Disabled if it's not admin, enabled for SCIM integration   -->
          <div class="field">
            <Label size="L">Role</Label>
            <Select
              placeholder={null}
              disabled={!sdk.users.isAdmin($auth.user) || isTenantOwner}
              value={isTenantOwner ? "owner" : globalRole}
              options={isTenantOwner
                ? Constants.ExtendedBudibaseRoleOptions
                : Constants.BudibaseRoleOptions}
              on:change={updateUserRole}
            />
          </div>
        {/if}
      </div>
    </Layout>
    <div>
      <Button
        cta
        disabled={Object.keys(userFieldsToUpdate).length === 0}
        on:click={saveUser}>Save</Button
      >
    </div>

    <Layout gap="S" noPadding>
      <Heading size="S">Workspaces</Heading>
      {#if privileged}
        <Banner showCloseButton={false}>
          This user's role grants admin access to all workspaces
        </Banner>
      {:else}
        <Table
          schema={appSchema}
          data={availableApps}
          customPlaceholder
          allowEditRows={false}
          allowEditColumns={false}
          customRenderers={customAppTableRenderers}
          on:click={e =>
            $goto(`/builder/workspace/[application]`, {
              application: e.detail.devId,
            })}
        >
          <div class="placeholder" slot="placeholder">
            <Heading size="S">
              This user doesn't have access to any workspace
            </Heading>
          </div>
        </Table>
      {/if}
    </Layout>
  </Layout>
{/if}

<Modal bind:this={deleteModal}>
  <DeleteUserModal {user} />
</Modal>
<Modal bind:this={resetPasswordModal}>
  <ForceResetPasswordModal {user} on:update={fetchUser} />
</Modal>

<style>
  .fields {
    display: grid;
    grid-gap: var(--spacing-m);
  }
  .field {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .user-info {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--spacing-l);
  }
  .tableTitle {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .subtitle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  }
  .placeholder {
    width: 100%;
    text-align: center;
  }
  .details-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
