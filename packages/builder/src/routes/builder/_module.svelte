<script>
  import { isActive, goto } from "@roxi/routify"
  import {
    admin,
    auth,
    appsStore,
    organisation,
    enrichedApps,
  } from "@/stores/portal"
  import { sdk } from "@budibase/shared-core"
  import { bb } from "@/stores/bb"
  import { onMount } from "svelte"
  import {
    CookieUtils,
    Constants,
    popNumSessionsInvalidated,
    invalidationMessage,
    derivedMemo,
  } from "@budibase/frontend-core"
  import Branding from "./Branding.svelte"
  import ContextMenu from "@/components/ContextMenu.svelte"
  import CommandPalette from "@/components/commandPalette/CommandPalette.svelte"
  import {
    Modal,
    notifications,
    Layout,
    Heading,
    Body,
    Button,
  } from "@budibase/bbui"
  import SettingsModal from "@/components/settings/SettingsModal.svelte"
  import { writable } from "svelte/store"

  $isActive
  $goto

  let initPromise
  let loaded = writable(false)
  let commandPaletteModal
  let settingsModal
  let hasAuthenticated = false

  $: multiTenancyEnabled = $admin.multiTenancy
  $: hasAdminUser = $admin?.checklist?.adminUser?.checked
  $: user = $auth.user
  $: isOwner = sdk.users.hasAdminPermissions(user)
  $: isBuilder = sdk.users.hasBuilderPermissions(user)
  // Re-run initBuilder when user logs in
  $: {
    const isAuthenticated = !!$auth.user
    if (isAuthenticated && !hasAuthenticated) {
      initPromise = initBuilder()
    }
    hasAuthenticated = isAuthenticated
  }

  const isOnPreLoginPage = () => {
    return $isActive("./auth") || $isActive("./invite") || $isActive("./admin")
  }

  derivedMemo(
    [admin, auth, enrichedApps, isActive, appsStore, loaded],
    ([$admin, $auth, $enrichedApps, $isActive, $appsStore, $loaded]) => {
      // Only run remaining logic when fully loaded
      if (!$loaded || !$admin.loaded || !$auth.loaded) {
        return null
      }

      // Set the return url on logout
      if (
        !$auth.user &&
        !CookieUtils.getCookie(Constants.Cookies.ReturnUrl) &&
        !$auth.postLogout &&
        !isOnPreLoginPage()
      ) {
        CookieUtils.setCookie(Constants.Cookies.ReturnUrl, window.location.href)
        return
      }

      // if tenant is not set go to it
      if (multiTenancyEnabled && !$auth.tenantSet) {
        $goto("./auth/org")
        return
      }

      // Force creation of an admin user if one doesn't exist
      if (!hasAdminUser) {
        $goto("./admin")
        return
      }

      // Redirect to log in at any time if the user isn't authenticated
      if (!$auth.user && !isOnPreLoginPage()) {
        $goto(`./auth`)
        return
      }

      // Check if password reset required for user
      if ($auth.user?.forceResetPassword) {
        $goto(`./auth/reset`)
        return
      }

      // Authenticated user navigation
      if ($auth.user) {
        const returnUrl = CookieUtils.getCookie(Constants.Cookies.ReturnUrl)

        // Return to saved URL first - skip onboarding check if user has a return URL
        if (returnUrl) {
          CookieUtils.removeCookie(Constants.Cookies.ReturnUrl)
          window.location.assign(returnUrl)
          return
        }

        // Review if builder users have workspaces. If not, redirect them to get-started
        const hasEditableWorkspaces = $enrichedApps.some(app => app.editable)
        if (
          ($appsStore.apps.length === 0 ||
            (isBuilder && !hasEditableWorkspaces)) &&
          !$isActive("./apps") &&
          !$isActive("./onboarding") &&
          !$isActive("./get-started")
        ) {
          // Tenant owners without apps should be redirected to onboarding
          if (isOwner) {
            $goto("./onboarding")
            return
          }
          // Regular builders without apps should be redirected to "get started"
          if (isBuilder && !isOwner) {
            $goto("./get-started")
            return
          }
        }

        // Redirect non-builders to apps unless they're already there
        if (!isBuilder && !$isActive("./apps")) {
          $goto(`./apps`)
          return
        }

        // Default workspace selection for builders
        const isOnWorkspaceRoute =
          $isActive("./workspace/[application]") ||
          $isActive("./workspace/updating/[application]")
        if (
          isBuilder &&
          $appsStore.apps.length &&
          !isOnWorkspaceRoute &&
          !$isActive("./apps")
        ) {
          // Find first editable app to redirect to
          const defaultApp = $enrichedApps.find(app => app.editable)
          // Only redirect if enriched apps are loaded and app is editable
          if (defaultApp?.devId) {
            $goto(`./workspace/[application]`, {
              application: defaultApp.devId,
            })
          }
          return
        }
      }
    }
  )

  async function initBuilder() {
    loaded.set(false)
    try {
      await auth.getSelf()
      await admin.init()

      if ($admin.maintenance.length > 0) {
        $goto("./maintenance")
        return
      }
      if ($auth.user) {
        // We need to load apps to know if we need to show onboarding fullscreen
        await Promise.all([appsStore.load(), organisation.init()])

        await auth.getInitInfo()
      }

      // Validate tenant if in a multi-tenant env
      if (multiTenancyEnabled) {
        await auth.validateTenantId()
      }
    } catch (error) {
      // Don't show a notification here, as we might 403 initially due to not
      // being logged in. API error handler will clear user if session was destroyed.
      console.error("Error during builder initialization:", error)
      // Rethrow to trigger catch block in template
      throw error
    }

    loaded.set(true)

    const invalidated = popNumSessionsInvalidated()
    if (invalidated > 0) {
      notifications.info(invalidationMessage(invalidated), {
        duration: 5000,
      })
    }
  }

  // Event handler for the command palette
  const handleKeyDown = e => {
    if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      commandPaletteModal.toggle()
    }
  }

  onMount(() => {
    initPromise = initBuilder()
    hasAuthenticated = !!$auth.user
  })
</script>

<!-- Global settings modal -->
<SettingsModal bind:this={settingsModal} on:hide={() => bb.hideSettings()} />

<!-- Portal branding overrides -->
<Branding />
<ContextMenu />

<svelte:window on:keydown={handleKeyDown} />
<Modal bind:this={commandPaletteModal} zIndex={999999}>
  <CommandPalette />
</Modal>

{#await initPromise}
  <div class="loading"></div>
{:then _}
  {#if $loaded || $admin.maintenance.length}
    <div class="content">
      <slot />
    </div>
  {/if}
{:catch error}
  <div class="init page-error">
    <Layout gap={"S"} alignContent={"center"} justifyItems={"center"}>
      <Heading size={"L"}>Oops...</Heading>
      <Body size={"S"}>There was a problem initialising the builder</Body>
      {#if error?.message}
        <div class="error-message">
          {error.message}
        </div>
      {/if}
      <Button
        secondary
        on:click={() => {
          $goto("/")
        }}
      >
        Reload
      </Button>
    </Layout>
  </div>
{/await}

<style>
  .init.page-error,
  .init.page-error :global(.container) {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }
  .error-message {
    padding: var(--spacing-m);
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-50);
    font-family: monospace;
    font-size: 12px;
    max-width: 90%;
    word-break: break-all;
  }
  .loading {
    min-height: 100vh;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .content {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    height: 100%;
    overflow: hidden;
  }
</style>
