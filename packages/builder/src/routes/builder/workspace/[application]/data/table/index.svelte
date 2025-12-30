<script>
  import { onMount } from "svelte"
  import { tables } from "@/stores/builder"
  import { goto } from "@roxi/routify"
  import { TableNames } from "@/constants"

  $goto

  onMount(() => {
    if ($tables.selected) {
      $goto(`../[tableId]`, { tableId: $tables.selected._id })
    } else {
      $goto(`../[tableId]`, { tableId: TableNames.USERS })
    }
  })
</script>

{#if !$tables.list?.length}
  <i>Create your first table to start building</i>
{:else}<i>Select a table to edit</i>{/if}

<style>
  i {
    font-size: var(--font-size-m);
    color: var(--grey-5);
    margin-top: 2px;
  }
</style>
