<script lang="ts">
import { goto as gotoStore, params } from "@roxi/routify"
import { onMount } from "svelte"
import { screenStore, workspaceAppStore } from "@/stores/builder"

$: goto = $gotoStore
$params

const validate = (id: string) => $workspaceAppStore.workspaceApps.some((app) => app._id === id)

const fallback = () => {
  const workspaceAppScreens = $screenStore.screens.filter(
    (s) => s.workspaceAppId === $params.workspaceAppId
  )
  if (workspaceAppScreens.length && workspaceAppScreens[0]._id) {
    screenStore.select(workspaceAppScreens[0]._id)
    goto("./[screenId]", {
      screenId: workspaceAppScreens[0]._id,
    })
    return
  }

  goto("../new")
}

$: if ($screenStore && $params.screenId) {
  const screenExists = $screenStore.screens.some((s) => s._id === $params.screenId)
  if (!screenExists) {
    fallback()
  }
}

onMount(() => {
  const id = $params.workspaceAppId
  const screenId = $params.screenId
  if (validate(id)) {
    workspaceAppStore.select(id)
  } else {
    goto("../../design")
    return
  }

  if (!screenId) {
    fallback()
  }
})
</script>

<slot />
