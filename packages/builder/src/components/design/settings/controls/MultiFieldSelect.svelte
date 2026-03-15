<script>
import { ContextTooltip, Multiselect } from "@budibase/bbui"
import { params } from "@roxi/routify"
import { debounce } from "lodash"
import { createEventDispatcher } from "svelte"
import { getDatasourceForProvider, getSchemaForDatasource } from "@/dataBinding"
import { selectedScreen } from "@/stores/builder"
import { Explanation } from "./Explanation"

$params

export let componentInstance = {}
export let value = ""
export let placeholder
export let explanation

let contextTooltipAnchor = null
let currentOption = null
let contextTooltipVisible = false

const dispatch = createEventDispatcher()
const getValidOptions = (selectedOptions, allOptions) => {
  // Fix the hardcoded default string value
  if (!Array.isArray(selectedOptions)) {
    selectedOptions = []
  }
  return selectedOptions.filter((val) => allOptions.indexOf(val) !== -1)
}

const setValue = (value) => {
  boundValue = getValidOptions(value.detail, options)
  dispatch("change", boundValue)
}

const onOptionMouseenter = (e, option) => {
  updateTooltip(e, option)
}

const onOptionMouseleave = (e) => {
  updateTooltip(e, null)
}

$: datasource = getDatasourceForProvider($selectedScreen, componentInstance)
$: schema = getSchemaForDatasource($selectedScreen, datasource).schema
$: options = Object.keys(schema || {})
$: boundValue = getValidOptions(value, options)

const updateTooltip = debounce((e, option) => {
  if (option == null) {
    contextTooltipVisible = false
  } else {
    contextTooltipAnchor = e?.target
    currentOption = option
    contextTooltipVisible = true
  }
}, 200)
</script>

<Multiselect
  iconPosition="right"
  {placeholder}
  value={boundValue}
  on:change={setValue}
  {options}
  align="right"
  {onOptionMouseenter}
  {onOptionMouseleave}
/>

{#if explanation}
  <ContextTooltip
    visible={contextTooltipVisible}
    anchor={contextTooltipAnchor}
    offset={20}
  >
    <Explanation
      tableHref={`/builder/workspace/${$params.application}/data/table/${datasource?.tableId}`}
      schema={schema[currentOption]}
      name={currentOption}
      {explanation}
      componentName={componentInstance._component}
    />
  </ContextTooltip>
{/if}
