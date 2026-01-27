<script>
  import {
    keepOpen,
    Label,
    ActionButton,
    ModalContent,
    InputDropdown,
    Select,
    RadioGroup,
    PillInput,
    Layout,
    Icon,
  } from "@budibase/bbui"
  import { organisation } from "@/stores/portal/organisation"
  import { Constants, emailValidator } from "@budibase/frontend-core"

  import { OnboardingType } from "@/constants"

  export let showOnboardingTypeModal
  export let workspaceOnly = false
  export let useWorkspaceInviteModal = workspaceOnly
  export let assignToWorkspace = workspaceOnly
  export let inviteTitle = "Invite users to workspace"

  const password = generatePassword(12)
  let emailsInput = []
  let emailError = null
  const maxItems = 15
  let selectedRole = Constants.BudibaseRoles.AppUser
  let onboardingType = OnboardingType.EMAIL

  $: userData = [
    {
      email: "",
      role: "appUser",
      password,
      forceResetPassword: true,
    },
  ]
  $: hasError = userData.find(x => x.error != null)
  $: parsedEmails = useWorkspaceInviteModal ? emailsInput : []
  $: passwordInviteDisabled = $organisation?.isSSOEnforced

  function removeInput(idx) {
    userData = userData.filter((e, i) => i !== idx)
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

  function validateInput(input, index) {
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

    const invalidEmails = emails.filter(email => emailValidator(email) !== true)

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
    return emailsInput.map(email => ({
      email,
      role: selectedRole,
      password: generatePassword(12),
      forceResetPassword: true,
    }))
  }

  function generatePassword(length) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, length)
  }

  const onConfirm = () => {
    if (useWorkspaceInviteModal) {
      const isValid = validateWorkspaceEmails()
      if (!isValid || !onboardingType) {
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
    : hasError || !userData.length}
>
  <svelte:fragment slot="header">
    {#if useWorkspaceInviteModal}
      <span class="modal-title">
        <Icon name="user-plus" size="XL" />
        <span>{inviteTitle}</span>
      </span>
    {/if}
  </svelte:fragment>
  {#if useWorkspaceInviteModal}
    <Layout noPadding gap="S">
      <PillInput
        label="Type or paste emails below, separated by commas"
        bind:value={emailsInput}
        error={emailError}
        splitOnSpace={true}
        maxItems={maxItems + 1}
        on:change={handleEmailsChange}
      />

      <div class="role-select">
        <Select
          label="Select role"
          bind:value={selectedRole}
          options={Constants.BudibaseRoleOptions}
          getOptionLabel={option => option.label}
          getOptionValue={option => option.value}
          getOptionSubtitle={option => option.subtitle}
          showSelectedSubtitle={true}
        />
      </div>

      <div class="onboarding">
        <Label>Select onboarding</Label>
        <RadioGroup
          bind:value={onboardingType}
          options={[
            {
              label: "Send email invites",
              value: OnboardingType.EMAIL,
            },
            {
              label: "Generate passwords for each user",
              value: OnboardingType.PASSWORD,
              disabled: passwordInviteDisabled,
            },
          ]}
          getOptionLabel={option => option.label}
          getOptionValue={option => option.value}
          getOptionSubtitle={option => option.subtitle}
          getOptionDisabled={option => option.disabled}
        />
      </div>
    </Layout>
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
              bind:inputValue={input.email}
              bind:dropdownValue={input.role}
              options={Constants.BudibaseRoleOptions}
              error={input.error}
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
    gap: var(--spacing-xs);
  }
  .onboarding :global(.spectrum-Radio-label.radio-label) {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-s);
  }
  .onboarding :global(.radio-label-subtitle) {
    color: var(--spectrum-global-color-gray-600);
    font-size: 12px;
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
  .role-select :global(.spectrum-Picker) {
    height: auto;
    align-items: center;
    padding-top: var(--spacing-m);
    padding-bottom: var(--spacing-m);
  }
</style>
