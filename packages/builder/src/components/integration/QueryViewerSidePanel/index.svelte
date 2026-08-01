<script lang="ts">
import { ActionButton } from "@supertoolmake/bbui"
import Panel from "@/components/design/Panel.svelte"
import JSONPanel from "./JSONPanel.svelte"
import PreviewPanel from "./PreviewPanel.svelte"
import SchemaPanel from "./SchemaPanel.svelte"

export let rows
export let schema
export let onSchemaChange = () => {}
export let collapsed = false

const tabs = ["JSON", "Schema", "Preview"]
let activeTab = "Preview"

const toggleCollapse = () => {
  collapsed = !collapsed
}
</script>

<Panel
  showCloseButton
  closeButtonIcon={collapsed ? "caret-down" : "caret-up"}
  onClickCloseButton={toggleCollapse}
  onClickHeader={toggleCollapse}
  headerClickable
  title="Query results"
  icon={"SQLQuery"}
>
  <div slot="panel-header-content">
    {#if !collapsed}
      <div class="settings-tabs">
        {#each tabs as tab}
          <ActionButton
            size="M"
            quiet
            selected={activeTab === tab}
            on:click={() => {
              activeTab = tab
            }}
          >
            {tab}
          </ActionButton>
          {#if tab === "Preview"}
            <span class="row-count">{rows?.length ?? 0} rows</span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
  <div class="content">
    {#if !collapsed}
      {#if activeTab === "JSON"}
        <JSONPanel data={rows?.length === 1 ? rows[0] : rows || {}} />
      {:else if activeTab === "Schema"}
        <SchemaPanel {onSchemaChange} {schema} />
      {:else}
        <PreviewPanel {schema} {rows} />
      {/if}
    {/if}
  </div>
</Panel>

<style>
  .settings-tabs {
    display: flex;
    align-items: center;
    gap: var(--spacing-s);
    padding: 0 var(--spacing-l);
    padding-bottom: var(--spacing-l);
  }

  .row-count {
    margin-left: auto;
    color: var(--grey-6);
    white-space: nowrap;
  }

  .content {
    padding: 14px;
    height: 100%;
    overflow: scroll;
  }
</style>
