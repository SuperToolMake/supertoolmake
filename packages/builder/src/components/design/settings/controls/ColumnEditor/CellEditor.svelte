<script>
import { Button, Drawer, Icon } from "@budibase/bbui"
import CellDrawer from "./CellDrawer.svelte"

export let column

let boundValue
let drawer

const updateBoundValue = (value) => {
  boundValue = { ...value }
}

const open = () => {
  updateBoundValue(column)
  drawer.show()
}

const save = () => {
  column = boundValue
  drawer.hide()
}

$: updateBoundValue(column)
</script>

<Icon name="gear" hoverable size="S" on:click={open} />
<Drawer bind:this={drawer} title={column.name}>
  <svelte:fragment slot="description">
    "{column.name}" column settings
  </svelte:fragment>
  <Button cta slot="buttons" on:click={save}>Save</Button>
  <CellDrawer slot="body" bind:column={boundValue} />
</Drawer>
