<script>
import { Body, Button, Heading, Layout, notifications, ProgressCircle } from "@supertoolmake/bbui"
import { PasswordRepeatInput } from "@supertoolmake/frontend-core"
import { goto as gotoStore } from "@roxi/routify"
import Logo from "assets/supertoolmake-emblem.svg"
import { onMount } from "svelte"
import { admin, auth, organisation } from "@/stores/portal"

const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key) || undefined

async function reset() {
  if (!form.validate() || passwordError) {
    return
  }
  try {
    loading = true
    if (forceResetPassword) {
      const email = $auth.user.email
      const tenantId = $auth.user.tenantId
      await auth.updateSelf({
        password,
        forceResetPassword: false,
      })
      if (!$auth.user) {
        // Update self will clear the platform user, so need to login
        await auth.login(email, password, tenantId)
      }
      goto("/")
    } else {
      await auth.resetPassword(password, resetCode)
      notifications.success("Password reset successfully")
      // send them to login if reset successful
      goto("../login")
    }
  } catch (err) {
    loading = false
    notifications.error(err.message || "Unable to reset password")
  }
}

const handleKeydown = (evt) => {
  if (evt.key === "Enter") {
    reset()
  }
}

$: goto = $gotoStore

let resetCode = getQueryParam("code")
let form
let loaded = false
let loading = false
let password
let passwordError

$: forceResetPassword = $auth?.user?.forceResetPassword

onMount(async () => {
  try {
    await auth.getSelf()
    await organisation.init()
  } catch {
    notifications.error("Error getting org config")
  }
  loaded = true
})
</script>

<svelte:window on:keydown={handleKeydown} />
<div class="page-container">
  <div class="content">
    <Layout gap="S" noPadding>
      {#if loaded}
        <img alt="logo" src={$organisation.logoUrl || Logo} />
      {/if}
      <Layout gap="S" noPadding>
        <Heading size="M">Reset your password</Heading>
        <Body size="M">Must contain at least 12 characters</Body>
        <PasswordRepeatInput
          bind:passwordForm={form}
          bind:password
          bind:error={passwordError}
          minLength={$admin.passwordMinLength || 12}
        />
        <Button secondary cta on:click={reset}>
          {#if loading}
            <ProgressCircle overBackground={true} size="S" />
          {:else}
            Reset
          {/if}
        </Button>
      </Layout>
      <div></div>
    </Layout>
  </div>
</div>

<style>
  .page-container {
    height: 100vh;
    display: grid;
    place-items: center;
    padding: 40px;
    overflow-y: auto;
  }
  .content {
    width: 100%;
    max-width: 400px;
    min-height: 480px;
  }
  img {
    width: 48px;
  }
</style>
