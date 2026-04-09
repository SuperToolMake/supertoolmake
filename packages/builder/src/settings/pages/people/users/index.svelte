<script lang="ts">
import { Button, Modal, notifications, Pagination, Search, Table } from "@supertoolmake/bbui"
import { Constants, fetchData, Utils } from "@supertoolmake/frontend-core"
import { sdk } from "@supertoolmake/shared-core"
import type { BulkUserCreated, InviteUsersResponse, User as UserDoc } from "@supertoolmake/types"
import { InternalTable } from "@supertoolmake/types"
import { get } from "svelte/store"
import { API } from "@/api"
import DeleteRowsButton from "@/components/backend/DataTable/buttons/DeleteRowsButton.svelte"
import { OnboardingType } from "@/constants"
import { routeActions } from "@/settings/pages"
import { bb } from "@/stores/bb"
import { appStore } from "@/stores/builder/app"
import { auth } from "@/stores/portal/auth"
import { organisation } from "@/stores/portal/organisation"
import { users } from "@/stores/portal/users"
import type { UserInfo } from "@/types"
import AddUserModal from "./_components/AddUserModal.svelte"
import DateAddedRenderer from "./_components/DateAddedRenderer.svelte"
import EditWorkspaceUserModal from "./_components/EditWorkspaceUserModal.svelte"
import EmailTableRenderer from "./_components/EmailTableRenderer.svelte"
import InvitedModal from "./_components/InvitedModal.svelte"
import PasswordModal from "./_components/PasswordModal.svelte"
import RoleTableRenderer from "./_components/RoleTableRenderer.svelte"
import { getRoleFlags, shouldSyncGlobalRole } from "./roleUtils"

interface EnrichedUser extends UserDoc {
  name: string
  apps: string[]
  access: number
  workspaceRole?: string
  workspaceRoleGroupRole?: string
}

const PAGE_SIZE = 8
const TABLE_MIN_HEIGHT = 36 + 55 * PAGE_SIZE
const initialWorkspaceId = (() => {
  const appId = get(appStore).appId
  return appId ? sdk.applications.getProdAppID(appId) : ""
})()

const fetch = fetchData({
  API,
  datasource: {
    type: "user",
    tableId: InternalTable.USER_METADATA,
  },
  options: {
    paginate: true,
    limit: PAGE_SIZE,
    query: { workspaceId: initialWorkspaceId },
  },
})

interface UserData {
  users: UserInfo[]
  assignToWorkspace?: boolean
}

interface WorkspaceExistingUserResult {
  usersToInvite: UserInfo[]
  addedToWorkspaceEmails: string[]
  assignedCount: number
  failedCount: number
}

let enrichedUsers: EnrichedUser[] = []
let createUserModal: Modal,
  inviteConfirmationModal: Modal,
  passwordModal: Modal,
  editWorkspaceUserModal: Modal
let searchEmail: string | undefined
let selectedRows: UserDoc[] = []
let selectedWorkspaceUser: UserDoc | null = null
let bulkSaveResponse: BulkUserCreated
let addedToWorkspaceEmails: string[] = []

let currentWorkspaceId = ""
let workspaceReady = false
let isWorkspaceQueryReady = false
let tableLoading = false

const buildEnrichedUsers = (rows: UserDoc[]): EnrichedUser[] => {
  return (
    rows?.map<EnrichedUser>((user) => {
      const role = Constants.ExtendedBudibaseRoleOptions.find(
        (x) => x.value === users.getUserRole(user)
      )!
      const workspaceRoleFromUser = currentWorkspaceId
        ? user.roles?.[currentWorkspaceId]
        : undefined
      const workspaceRole = workspaceRoleFromUser
      const isWorkspaceTenantAdmin = role.value === Constants.BudibaseRoles.Admin
      return {
        ...user,
        name: user.firstName ? `${user.firstName} ${user.lastName}` : "",
        workspaceRole,
        __selectable: !(
          role.value === Constants.BudibaseRoles.Owner ||
          $auth.user?.email === user.email ||
          isWorkspaceTenantAdmin
        ),
        apps: sdk.users.userAppAccessList(user),
        access: role.sortOrder,
      }
    }) || []
  )
}

const refreshUserList = async () => {
  await fetch.refresh()
}

const updateFetch = (email: string | undefined, workspaceId: string) => {
  if (!workspaceId) {
    return
  }
  const query: { workspaceId: string; fuzzy?: { email: string } } = {
    workspaceId,
  }
  if (email) {
    query.fuzzy = { email }
  }
  fetch.update({ query })
}

const showOnboardingTypeModal = async (addUsersData: UserData, onboardingType?: string) => {
  // no-op if users already exist
  userData = await removingDuplicities(addUsersData)
  if (!userData?.users?.length) {
    return
  }

  if ($organisation.isSSOEnforced) {
    // bypass the onboarding type selection if sso is enforced
    await chooseCreationType(OnboardingType.EMAIL)
  } else if (onboardingType) {
    await chooseCreationType(onboardingType)
  }
}

async function createUserFlow() {
  let usersForInvite = userData?.users ?? []
  let assignedExistingUsers = false
  const result = await assignExistingUsersToWorkspace(userData)
  usersForInvite = result.usersToInvite
  const shouldShowInviteModal = usersForInvite.length > 0
  assignedExistingUsers = result.assignedCount > 0

  if (result.assignedCount && !shouldShowInviteModal) {
    notifications.success("Users added to workspace")
  }
  if (result.failedCount) {
    notifications.error("Error adding some users to workspace")
  }
  if (!usersForInvite.length) {
    await refreshUserList()
    return
  }

  const assignToWorkspace = userData.assignToWorkspace ?? true
  const payload = usersForInvite.map((user) => {
    const workspaceRole = getWorkspaceRole(user.role, user.appRole)
    return {
      email: user.email,
      builder: user.role === Constants.BudibaseRoles.Developer,
      creator: user.role === Constants.BudibaseRoles.Creator,
      admin: user.role === Constants.BudibaseRoles.Admin,
      apps:
        assignToWorkspace && currentWorkspaceId && workspaceRole
          ? { [currentWorkspaceId]: workspaceRole }
          : undefined,
    }
  })
  try {
    inviteUsersResponse = await users.invite(payload)
    await refreshUserList()
    inviteConfirmationModal.show()
  } catch {
    if (assignedExistingUsers) {
      await refreshUserList()
    }
    notifications.error("Error inviting user")
  }
}

const removingDuplicities = async (userData: UserData): Promise<UserData> => {
  const currentUserEmails = new Set(((await users.fetch()) || []).map((x) => x.email.toLowerCase()))
  const newUsers: UserInfo[] = []
  const seenEmails = new Set<string>()

  for (const user of userData?.users ?? []) {
    const email = user.email.toLowerCase()
    if (seenEmails.has(email) || currentUserEmails.has(email)) {
      continue
    }
    seenEmails.add(email)
    newUsers.push(user)
  }
  if ((userData?.users?.length || 0) > 0 && !newUsers.length) {
    notifications.info("There are no new users to add.")
  }
  return { ...userData, users: newUsers }
}

const assignExistingUsersToWorkspace = async (
  userData: UserData
): Promise<WorkspaceExistingUserResult> => {
  if (!currentWorkspaceId) {
    return {
      usersToInvite: userData.users,
      addedToWorkspaceEmails: [],
      assignedCount: 0,
      failedCount: 0,
    }
  }

  const existingUsers = (await users.fetch()) || []
  const existingByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user]))
  const usersToInvite: UserInfo[] = []
  const usersToAssign: {
    user: UserDoc
    role: string
    selectedRole: string
    email: string
  }[] = []

  for (const user of userData.users) {
    const existingUser = existingByEmail.get(user.email.toLowerCase())
    if (!existingUser) {
      usersToInvite.push(user)
      continue
    }
    const role = getWorkspaceRole(user.role, user.appRole)
    if (role && existingUser._id) {
      usersToAssign.push({
        user: existingUser,
        role,
        selectedRole: user.role,
        email: user.email,
      })
    }
  }

  const assignmentResults = await Promise.allSettled(
    usersToAssign.map(async ({ user, role, selectedRole, email }) => {
      let rev = user._rev
      let fullUser = user
      if (user._id && (!rev || shouldSyncGlobalRole(selectedRole, user))) {
        const loaded = await users.get(user._id)
        if (loaded) {
          fullUser = loaded
          rev = loaded._rev
        }
      }
      if (user._id && fullUser && shouldSyncGlobalRole(selectedRole, fullUser)) {
        const roleUpdates = getRoleFlags(selectedRole, fullUser)
        const saved = await users.save({ ...fullUser, ...roleUpdates })
        rev = saved?._rev || rev
      }
      if (!(user._id && rev)) {
        throw new Error("User ID or revision missing")
      }
      await users.addUserToWorkspace(user._id, role, rev)
      return email
    })
  )

  const successfulAssignments = assignmentResults
    .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
    .map((result) => result.value)

  return {
    usersToInvite,
    addedToWorkspaceEmails: successfulAssignments,
    assignedCount: successfulAssignments.length,
    failedCount: assignmentResults.filter((result) => result.status === "rejected").length,
  }
}

async function createUsers() {
  try {
    addedToWorkspaceEmails = []
    let usersForCreation = await removingDuplicities(userData)

    const result = await assignExistingUsersToWorkspace(usersForCreation)
    usersForCreation = { ...usersForCreation, users: result.usersToInvite }
    addedToWorkspaceEmails = result.addedToWorkspaceEmails

    if (result.assignedCount && !usersForCreation.users.length) {
      notifications.success("Users added to workspace")
    }
    if (result.failedCount) {
      notifications.error("Error adding some users to workspace")
    }
    if (!usersForCreation.users.length) {
      await refreshUserList()
      return
    }

    bulkSaveResponse = (await users.create(usersForCreation)) || {
      successful: [],
      unsuccessful: [],
    }
    const assignToWorkspace = userData.assignToWorkspace ?? true
    if (assignToWorkspace && currentWorkspaceId && bulkSaveResponse.successful) {
      await Promise.all(
        bulkSaveResponse.successful.map(async (user) => {
          const matchingUser = userData.users.find((created) => created.email === user.email)
          const role = getWorkspaceRole(matchingUser?.role, matchingUser?.appRole)
          if (!role) {
            return
          }
          const fullUser = await users.get(user._id)
          if (fullUser?._rev) {
            await users.addUserToWorkspace(user._id, role, fullUser._rev)
          }
        })
      )
    }
    notifications.success("Successfully created user")
    passwordModal.show()
    await refreshUserList()
  } catch (error) {
    if (addedToWorkspaceEmails.length > 0) {
      await refreshUserList()
    }
    console.error(error)
    notifications.error("Error creating user")
  }
}

async function chooseCreationType(onboardingType: string) {
  if (onboardingType === OnboardingType.EMAIL) {
    await createUserFlow()
  } else {
    await createUsers()
  }
}

const deleteUsers = async () => {
  try {
    const ids = selectedRows.map((user) => user._id)

    if (selectedRows.some((u) => u.scimInfo?.isSync)) {
      notifications.error("You cannot delete users created via your AD")
      return
    }

    if (ids.includes(get(auth).user?._id)) {
      notifications.error("You cannot delete yourself")
      return
    }

    if (ids.length > 0) {
      await users.bulkDelete(
        selectedRows.map((user) => ({
          userId: user._id!,
          email: user.email,
        }))
      )
    }

    notifications.success(`Successfully deleted ${selectedRows.length} users`)
    selectedRows = []
    await refreshUserList()
  } catch {
    notifications.error("Error deleting users")
  }
}

const getWorkspaceRole = (role?: string, appRole?: string) => {
  if (!(currentWorkspaceId && role)) {
    return
  }
  if (role === Constants.BudibaseRoles.Creator) {
    return Constants.Roles.CREATOR
  }
  if (role === Constants.BudibaseRoles.Admin) {
    return Constants.Roles.ADMIN
  }
  if (role === Constants.BudibaseRoles.AppUser) {
    return appRole || Constants.Roles.BASIC
  }
  return Constants.Roles.BASIC
}

const onRowClick = ({ detail }: { detail: UserDoc }) => {
  selectedWorkspaceUser = detail
  editWorkspaceUserModal.show()
}

const onWorkspaceUserSaved = async () => {
  await refreshUserList()
}

const debouncedUpdateFetch = Utils.debounce(updateFetch, 250)

$: currentWorkspaceId = $appStore.appId ? sdk.applications.getProdAppID($appStore.appId) : ""
$: workspaceReady = Boolean(currentWorkspaceId)
$: isWorkspaceQueryReady =
  ($fetch.query as { workspaceId?: string })?.workspaceId === currentWorkspaceId
$: tableLoading = !(workspaceReady && isWorkspaceQueryReady && $fetch.loaded)

$: customRenderers = [
  { column: "email", component: EmailTableRenderer },
  { column: "role", component: RoleTableRenderer },
  { column: "createdAt", component: DateAddedRenderer },
]
let userData: UserData = { users: [] }

$: readonly = !sdk.users.isAdmin($auth.user)
$: debouncedUpdateFetch(searchEmail, currentWorkspaceId)
$: schema = {
  email: {
    displayName: "Email",
    sortable: false,
    width: "minmax(200px, max-content)",
    minWidth: "200px",
  },
  role: {
    displayName: "Access",
    sortable: false,
    width: "1fr",
  },
  createdAt: {
    displayName: "Date added",
    sortable: false,
    width: "1fr",
    minWidth: "160px",
  },
}
let inviteUsersResponse: InviteUsersResponse = {
  successful: [],
  unsuccessful: [],
}
$: enrichedUsers = buildEnrichedUsers($fetch.rows as UserDoc[])
$: shouldOpenWorkspaceInviteModal =
  $bb.settings.route?.entry?.path === "/people/workspace" && $bb.settings.route?.hash === "#invite"
$: if (shouldOpenWorkspaceInviteModal && createUserModal) {
  createUserModal.show()
}
</script>

<div class="people-page">
  <div use:routeActions class="controls">
    {#if !readonly}
      <div class="buttons">
        {#if selectedRows.length > 0}
          <DeleteRowsButton
            item="user"
            action="Delete"
            on:updaterows
            selectedRows={[...selectedRows]}
            deleteRows={deleteUsers}
          />
        {:else}
          <Search bind:value={searchEmail} placeholder="Search" />
          <Button
            size="M"
            disabled={readonly}
            on:click={createUserModal.show}
            cta
          >
            Invite to workspace
          </Button>
        {/if}
      </div>
    {/if}
  </div>
  <div class="table-wrap" style={`min-height: ${TABLE_MIN_HEIGHT}px;`}>
    <Table
      on:click={onRowClick}
      {schema}
      bind:selectedRows
      data={tableLoading ? [] : enrichedUsers}
      allowEditColumns={false}
      allowEditRows={false}
      allowSelectRows={!readonly}
      selectOnRowClick={false}
      {customRenderers}
      loading={false}
      customPlaceholder={tableLoading}
      defaultSortColumn={"access"}
      stickyHeader={false}
    >
      <div slot="placeholder" />
    </Table>
  </div>

  <div class="pagination">
    <Pagination
      page={$fetch.pageNumber + 1}
      hasPrevPage={tableLoading ? false : $fetch.hasPrevPage}
      hasNextPage={tableLoading ? false : $fetch.hasNextPage}
      goToPrevPage={fetch.prevPage}
      goToNextPage={fetch.nextPage}
    />
  </div>
</div>

<Modal bind:this={createUserModal} closeOnOutsideClick={false}>
  <AddUserModal
    {showOnboardingTypeModal}
    workspaceOnly={true}
    useWorkspaceInviteModal={true}
    assignToWorkspace={true}
    inviteTitle="Invite users to workspace"
  />
</Modal>

<Modal bind:this={inviteConfirmationModal}>
  <InvitedModal {inviteUsersResponse} />
</Modal>

<Modal bind:this={passwordModal} disableCancel={true}>
  <PasswordModal
    createUsersResponse={bulkSaveResponse}
    userData={userData.users}
    {addedToWorkspaceEmails}
  />
</Modal>

<Modal bind:this={editWorkspaceUserModal} closeOnOutsideClick={false}>
  <EditWorkspaceUserModal
    user={selectedWorkspaceUser}
    workspaceId={currentWorkspaceId}
    {readonly}
    onsaved={onWorkspaceUserSaved}
  />
</Modal>

<style>
  .buttons {
    display: flex;
    gap: var(--spacing-s);
    align-items: center;
  }
  .pagination {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    margin-left: auto;
  }
  .people-page {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-l);
    min-height: calc(100% - (var(--spacing-l) * 2) - 36px);
  }
  .table-wrap {
    display: flex;
    flex-direction: column;
  }
  .controls {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-xl);
  }
  .controls :global(.spectrum-Search) {
    width: 200px;
  }
</style>
