<script>
import { goto } from "@roxi/routify"
import { auth } from "@/stores/portal"

// If already authenticated, redirect away from the auth section.
// Check this onMount rather than a reactive statement to avoid trumping
// the login return URL functionality.
if ($auth.user && !$auth.user.forceResetPassword) {
  $goto("../")
}
</script>

{#if !$auth.user || $auth.user.forceResetPassword}
  <slot />
{/if}
