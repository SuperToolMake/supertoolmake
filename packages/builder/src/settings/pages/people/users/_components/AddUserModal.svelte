<script lang="ts">
import {
  ActionButton,
  Icon,
  InputDropdown,
  keepOpen,
  Label,
  Layout,
  ModalContent,
  PillInput,
  RadioGroup,
  Select,
} from "@supertoolmake/bbui"
import { Constants, emailValidator } from "@supertoolmake/frontend-core"
import GlobalRoleSelect from "@/components/common/GlobalRoleSelect.svelte"
import { OnboardingType } from "@/constants"
import { roles } from "@/stores/builder"
import { admin } from "@/stores/portal/admin"
import { organisation } from "@/stores/portal/organisation"

export let showOnboardingTypeModal
export let workspaceOnly = false
export let useWorkspaceInviteModal = workspaceOnly
export let assignToWorkspace = workspaceOnly
export let inviteTitle = "Invite users to workspace"

const password = generatePassword(12)
let emailsInput: string[] = []
let parsedEmails = []
let pendingEmailInput = ""
let emailError: string | null = null
const maxItems = 15
let selectedRole = Constants.BudibaseRoles.Creator
const builtInEndUserRoles = [Constants.Roles.BASIC, Constants.Roles.ADMIN]
const excludedRoleIds = [
  ...builtInEndUserRoles,
  Constants.Roles.PUBLIC,
  Constants.Roles.CREATOR,
  Constants.Roles.GROUP,
]
let roleColorLookup: Record<string, string | undefined> = {}
function removeInput(idx: number) {
  userData = userData.filter((_e, i) => i !== idx)
}

function addNewInput() {
  userData = [
    ...userData,
    {
      email: "",
      role: "appUser",
      password: generatePassword(12),
      forceResetPassword: true,
      error: null,
    },
  ]
}

function validateInput(input: UserData, index: number) {
  if (input.email) {
    input.email = input.email.trim()
  }
  const email = input.email
  if (email) {
    const res = emailValidator(email)
    if (res === true) {
      userData[index].error = null
    } else {
      userData[index].error = res
    }
  } else {
    userData[index].error = "Please enter an email address"
  }
  return userData[index].error == null
}

function validateWorkspaceEmails() {
  const emails = emailsInput
  if (!emails.length) {
    emailError = null
    return false
  }

  if (emails.length > maxItems) {
    emailError = `Max ${maxItems} users can be invited at once`
    return false
  }

  const invalidEmails = emails.filter((email) => emailValidator(email) !== true)

  if (invalidEmails.length) {
    emailError =
      invalidEmails.length === 1
        ? `Invalid email address: ${invalidEmails[0]}`
        : `Invalid email addresses: ${invalidEmails.join(", ")}`
    return false
  }

  emailError = null
  return true
}

const handleEmailsChange = () => {
  validateWorkspaceEmails()
}

function buildWorkspaceUsers() {
  return emailsInput.map((email) => ({
    email,
    role: selectedRole,
    appRole:
      workspaceOnly && selectedRole === Constants.BudibaseRoles.AppUser ? endUserRole : undefined,
    password: generatePassword(12),
    forceResetPassword: true,
  }))
}

function generatePassword(length: number) {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, length)
}

const onConfirm = () => {
  if (useWorkspaceInviteModal) {
    const isValid = validateWorkspaceEmails()
    if (!(isValid && onboardingType)) {
      return keepOpen
    }

    return showOnboardingTypeModal(
      {
        users: buildWorkspaceUsers(),
        assignToWorkspace,
      },
      onboardingType
    )
  }

  let valid = true
  userData.forEach((input, index) => {
    valid = validateInput(input, index) && valid
  })
  if (!valid) {
    return keepOpen
  }
  showOnboardingTypeModal({
    users: userData,
    assignToWorkspace,
  })
}

$: roleColorLookup = ($roles || []).reduce(
  (acc: Record<string, string | undefined>, role) => {
    acc[role._id] = role.uiMetadata?.color
    return acc
  },
  {} as Record<string, string | undefined>
)
$: customEndUserRoleOptions = ($roles || [])
  .filter((role) => !excludedRoleIds.includes(role._id))
  .map((role) => ({
    label: role.uiMetadata?.displayName || role.name || "Custom role",
    value: role._id,
    color: role.uiMetadata?.color || "var(--spectrum-global-color-static-magenta-400)",
  }))
$: endUserRoleOptions = [
  {
    label: "Basic user",
    value: Constants.Roles.BASIC,
    color: roleColorLookup[Constants.Roles.BASIC],
  },
  {
    label: "Admin user",
    value: Constants.Roles.ADMIN,
    color: roleColorLookup[Constants.Roles.ADMIN],
  },
  ...customEndUserRoleOptions,
]
let endUserRole = Constants.Roles.BASIC
let onboardingType: (typeof OnboardingType)[keyof typeof OnboardingType] | null =
  OnboardingType.EMAIL

type UserData = {
  email: string
  role: string
  password: string
  forceResetPassword: boolean
  error: string | null
}

let userData: UserData[] = [
  {
    email: "",
    role: "appUser",
    password,
    forceResetPassword: true,
    error: null,
  },
]
$: hasError = userData.find((x) => x.error != null)
$: {
  if (!useWorkspaceInviteModal) {
    parsedEmails = []
  } else {
    const pendingEmail = pendingEmailInput.trim()
    parsedEmails =
      emailsInput.length === 0 && emailValidator(pendingEmail) === true
        ? [pendingEmail]
        : emailsInput
  }
}
$: smtpConfigured = $admin.loaded && ($admin.cloud || Boolean($admin.checklist?.smtp?.checked))
$: emailInviteDisabled = $admin.loaded ? !smtpConfigured : false
$: passwordInviteDisabled = $organisation.isSSOEnforced
$: onboardingOptions = [
  {
    label: "Send email invites",
    subtitle: emailInviteDisabled ? "Requires SMTP setup" : undefined,
    value: OnboardingType.EMAIL,
    disabled: emailInviteDisabled,
  },
  {
    label: "Generate passwords for each user",
    value: OnboardingType.PASSWORD,
    disabled: passwordInviteDisabled,
  },
]
$: if (emailInviteDisabled && passwordInviteDisabled) {
  onboardingType = null
} else if (emailInviteDisabled) {
  onboardingType = OnboardingType.PASSWORD
} else if (passwordInviteDisabled) {
  onboardingType = OnboardingType.EMAIL
} else if (!onboardingType) {
  onboardingType = OnboardingType.EMAIL
}
</script>

<ModalContent
  {onConfirm}
  size="M"
  title={useWorkspaceInviteModal ? undefined : "Add new users"}
  confirmText={useWorkspaceInviteModal ? "Invite users" : "Add users"}
  cancelText="Cancel"
  disableCancelOnConfirm={true}
  showCloseIcon={false}
  disabled={useWorkspaceInviteModal
    ? !parsedEmails.length || !onboardingType || !!emailError
    : !!hasError || !userData.length}
>
  <svelte:fragment slot="header">
    {#if useWorkspaceInviteModal}
      <span class="modal-title">
        <Icon
          name="user-plus"
          size="XL"
          color="var(--spectrum-global-color-gray-600)"
        />
        <span>{inviteTitle}</span>
      </span>
    {/if}
  </svelte:fragment>
  {#if useWorkspaceInviteModal}
    <div class="workspace-invite-modal">
      <Layout noPadding gap="S">
        <PillInput
          label="Type or paste emails below, separated by commas"
          bind:value={emailsInput}
          bind:inputValue={pendingEmailInput}
          error={emailError ?? undefined}
          splitOnSpace={true}
          maxItems={maxItems + 1}
          on:change={handleEmailsChange}
        />

        <GlobalRoleSelect
          bind:value={selectedRole}
          options={Constants.BudibaseRoleOptions}
          size="L"
        />

        {#if workspaceOnly && selectedRole === Constants.BudibaseRoles.AppUser}
          <Select
            label="Select end user role"
            size="L"
            bind:value={endUserRole}
            options={endUserRoleOptions}
            getOptionLabel={option => option.label}
            getOptionValue={option => option.value}
            getOptionColour={option => option.color}
            placeholder={false}
          />
        {/if}

        <div class="onboarding">
          <Label size="L">Select onboarding</Label>
          <RadioGroup
            bind:value={onboardingType}
            options={onboardingOptions}
            getOptionLabel={option => option.label}
            getOptionValue={option => option.value}
            getOptionSubtitle={option => option.subtitle}
            getOptionDisabled={option => option.disabled}
          />
        </div>
      </Layout>
    </div>
  {:else}
    <Layout noPadding gap="XS">
      <Label>Email address</Label>
      {#each userData as input, index}
        <div
          style="display: flex;
          align-items: center;
          flex-direction: row;"
        >
          <div style="flex: 1 1 auto;">
            <InputDropdown
              inputType="email"
              autofocus={false}
              bind:inputValue={input.email as unknown as null | undefined}
              bind:dropdownValue={input.role as unknown as null | undefined}
              options={Constants.BudibaseRoleOptions}
              error={(input.error ?? undefined) as null | undefined}
              on:blur={() => validateInput(input, index)}
            />
          </div>
          <div class="icon">
            <Icon
              name="x"
              hoverable
              size="S"
              on:click={() => removeInput(index)}
            />
          </div>
        </div>
      {/each}

      <div>
        <ActionButton on:click={addNewInput} icon="plus">Add email</ActionButton
        >
      </div>
    </Layout>
  {/if}
</ModalContent>

<style>
  .icon {
    width: 10%;
    align-self: flex-start;
    margin-top: 8px;
  }
  .onboarding {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-s);
  }
  .onboarding :global(.spectrum-FieldGroup--vertical) {
    gap: 0;
  }
  .onboarding :global(.spectrum-Radio-label.radio-label) {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-s);
  }
  .onboarding :global(.radio-label-subtitle) {
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
  }
  .onboarding :global(.spectrum-Radio-button:before) {
    background: var(--spectrum-global-color-black);
    border-color: var(--spectrum-global-color-gray-600);
  }
  .onboarding
    :global(.spectrum-Radio-input:checked + .spectrum-Radio-button:before) {
    border-color: var(--spectrum-global-color-blue-700);
    background:
      radial-gradient(
        circle,
        var(--spectrum-global-color-black) 0 3px,
        transparent 4px
      ),
      var(--spectrum-global-color-blue-700);
  }
  .modal-title {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  .workspace-invite-modal :global(.spectrum-Radio-label),
  .workspace-invite-modal :global(.spectrum-Textfield-input),
  .workspace-invite-modal :global(.spectrum-Tags-itemLabel),
  .workspace-invite-modal :global(.error),
  .workspace-invite-modal :global(.radio-label-subtitle) {
    font-size: 14px;
  }
  .workspace-invite-modal :global(.pill-input) {
    gap: 6px;
    padding: 8px;
  }
</style>
