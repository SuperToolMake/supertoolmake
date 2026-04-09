<script>
import { DetailSummary } from "@supertoolmake/bbui"
import InfoDisplay from "./InfoDisplay.svelte"

export let componentDefinition
</script>

<DetailSummary collapsible={false} noPadding={true}>
  <InfoDisplay
    title={componentDefinition.name}
    body={componentDefinition.info}
  />
</DetailSummary>
