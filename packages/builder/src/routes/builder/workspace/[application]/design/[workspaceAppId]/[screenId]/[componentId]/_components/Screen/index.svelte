<script>
import { Layout } from "@supertoolmake/bbui"
import Panel from "@/components/design/Panel.svelte"
import { selectedScreen } from "@/stores/builder"
import GeneralPanel from "./GeneralPanel.svelte"
</script>

{#if $selectedScreen}
  <Panel
    title={$selectedScreen.routing.route}
    icon={$selectedScreen.routing.route === "/" ? "house" : "browser"}
    borderLeft
    wide
  >
    <Layout gap="XS" paddingX="XL" paddingY="XL">
      <GeneralPanel />
    </Layout>
  </Panel>
{/if}
