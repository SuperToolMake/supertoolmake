<script>
  import {
    keepOpen,
    Label,
    ActionButton,
    ModalContent,
    InputDropdown,
    Layout,
    Icon,
  } from "@budibase/bbui"
  import { Constants, emailValidator } from "@budibase/frontend-core"

  export let showOnboardingTypeModal

  const password = generatePassword(12)
  let disabled

  $: userData = [
    {
      email: "",
      role: "appUser",
      password,
      forceResetPassword: true,
    },
  ]
  $: hasError = userData.find(x => x.error != null)

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

  function generatePassword(length) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, length)
  }

  const onConfirm = () => {
    let valid = true
    userData.forEach((input, index) => {
      valid = validateInput(input, index) && valid
    })
    if (!valid) {
      return keepOpen
    }
    showOnboardingTypeModal({ users: userData })
  }
</script>

<ModalContent
  {onConfirm}
  size="M"
  title="Add new users"
  confirmText="Add users"
  confirmDisabled={disabled}
  cancelText="Cancel"
  showCloseIcon={false}
  disabled={hasError || !userData.length}
>
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
      <ActionButton on:click={addNewInput} icon="plus">Add email</ActionButton>
    </div>
  </Layout>
</ModalContent>

<style>
  .user-notification {
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: var(--spacing-m);
  }
  .icon {
    width: 10%;
    align-self: flex-start;
    margin-top: 8px;
  }
</style>
