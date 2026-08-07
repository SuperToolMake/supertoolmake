<script lang="ts">
import { Body, Divider, Heading, Layout, Table } from "@supertoolmake/bbui"
import { onMount } from "svelte"
import { capitalise, durationFromNow } from "@/helpers"
import { oauth2 } from "@/stores/builder"
import AddButton from "./AddButton.svelte"
import MoreMenuRenderer from "./MoreMenuRenderer.svelte"

const schema = {
  name: {
    sortable: false,
  },
  lastUsed: {
    displayName: "Last used",
    sortable: false,
  },
  more: {
    width: "auto",
    displayName: "",
  },
}

const customRenderers = [{ column: "more", component: MoreMenuRenderer }]

onMount(() => {
  oauth2.fetch()
})

$: configs = $oauth2.configs.map((config) => ({
  ...config,
  lastUsed: config.lastUsage ? capitalise(durationFromNow(config.lastUsage)) : "Never used",
}))
</script>

<Layout noPadding>
  <Layout gap="XS" noPadding>
    <div class="header">
      <Heading>OAuth2</Heading>
      <AddButton />
    </div>
    <Body>Manage and configure OAuth 2.0 Client Credentials for secure API access.</Body>
  </Layout>
  <Divider noMargin />

  <Table
    data={configs}
    loading={$oauth2.loading}
    {schema}
    {customRenderers}
    allowEditRows={false}
    allowEditColumns={false}
    allowClickRows={false}
  />
</Layout>

<style>
  .header {
    display: flex;
    justify-content: space-between;
  }
</style>
