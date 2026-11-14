<script>
import { Checkbox, Label, Select } from "@supertoolmake/bbui"
import { findAllMatchingComponents } from "@/helpers/components"
import { selectedScreen } from "@/stores/builder"

export let parameters

$: components = findAllMatchingComponents($selectedScreen?.props, (component) =>
  component._component.endsWith("fileupload")
)

// Stop on error is enabled by default, including for actions which were
// created before this option existed
$: if (parameters && parameters.stopOnError === undefined) {
  parameters.stopOnError = true
}
</script>

<div class="root">
  <Label small>Upload Component</Label>
  <Select
    bind:value={parameters.componentId}
    options={components}
    getOptionLabel={x => x._instanceName}
    getOptionValue={x => x._id}
  />

  <Label size="S" />
  <Checkbox text="Stop on error" bind:value={parameters.stopOnError} />
</div>

<style>
  .root {
    display: grid;
    column-gap: var(--spacing-l);
    row-gap: var(--spacing-s);
    grid-template-columns: 120px 1fr;
    align-items: center;
    max-width: 400px;
    margin: 0 auto;
  }
</style>
