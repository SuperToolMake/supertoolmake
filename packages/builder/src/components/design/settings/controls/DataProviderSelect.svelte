<script>
import { Select } from "@supertoolmake/bbui"
import { makePropSafe } from "@supertoolmake/string-templates"
import { findAllMatchingComponents } from "@/helpers/components"
import { selectedScreen } from "@/stores/builder"

export let value

const getValue = (component) => `{{ literal ${makePropSafe(component._id)} }}`

$: providers = findAllMatchingComponents($selectedScreen?.props, (c) =>
  c._component?.endsWith("/dataprovider")
)
</script>

<Select
  {value}
  placeholder={null}
  on:change
  options={providers}
  getOptionLabel={component => component._instanceName}
  getOptionValue={getValue}
/>
