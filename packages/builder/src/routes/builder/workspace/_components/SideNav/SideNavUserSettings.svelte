<script lang="ts">
import { PopoverAlignment } from "@supertoolmake/bbui"
import { UserAvatar } from "@supertoolmake/frontend-core"
import type { User } from "@supertoolmake/types"
import UserDropdown from "@/routes/builder/_components/UserDropdown.svelte"
import { auth } from "@/stores/portal"
import SideNavLink from "./SideNavLink.svelte"

export let collapsed = false

const getName = (user?: User) => {
  if (!user) {
    return ""
  }
  if (user.firstName) {
    if (user.lastName) {
      return `${user.firstName} ${user.lastName}`
    } else {
      return `${user.firstName}`
    }
  } else {
    return user.email
  }
}

$: user = $auth.user
$: name = getName(user)
</script>

{#if user}
  <UserDropdown align={PopoverAlignment.RightOutside} let:open>
    <SideNavLink text={name} {collapsed} isActive={open}>
      <UserAvatar slot="icon" size="XS" {user} showTooltip={false} />
    </SideNavLink>
  </UserDropdown>
{/if}
