<script>
import { InternalRenderer } from "@supertoolmake/bbui"

export let value
</script>

<div style="display: flex; ">
  {value}
  <div style="margin-left: 1.5rem;">
    <InternalRenderer {value} />
  </div>
</div>

<style>
</style>
