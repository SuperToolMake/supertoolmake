<script>
import { ContextTooltip, Select } from "@supertoolmake/bbui"
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
const getValidValue = (value, options) => {
  // Reset value if there aren't any options
  if (!Array.isArray(options)) {
    return null
  }

  // Reset value if the value isn't found in the options
  if (options.indexOf(value) === -1) {
    return null
  }

  return value
}

const onChange = (value) => {
  boundValue = getValidValue(value.detail, options)
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
$: boundValue = getValidValue(value, options)

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

<Select
  {placeholder}
  value={boundValue}
  on:change={onChange}
  {options}
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
