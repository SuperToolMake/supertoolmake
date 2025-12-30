<script>
  import { params, goto } from "@roxi/routify"
  import { screenStore } from "@/stores/builder"

  $params
  $goto

  $: screen = $screenStore.screens.find(s => s._id === $params.id)

  $: screen &&
    $goto(`./[workspaceAppId]/[screenId]`, {
      workspaceAppId: screen.workspaceAppId,
      screenId: screen._id,
    })
</script>
