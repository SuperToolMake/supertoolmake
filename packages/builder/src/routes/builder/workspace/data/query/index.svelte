<script>
import { goto } from "@roxi/routify"
import { onMount } from "svelte"
import { queries } from "@/stores/builder"

$goto

onMount(async () => {
  const { list, selected } = $queries
  if (selected) {
    $goto(`./${selected?._id}`)
  } else if (list?.length) {
    $goto(`./${list[0]._id}`)
  } else {
    $goto("../")
  }
})
</script>
