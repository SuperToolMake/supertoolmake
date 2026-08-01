<script>
import { cloneDeep } from "lodash/fp"
import Table from "@/components/backend/DataTable/Table.svelte"

export let schema = {}
export let rows = []
export let maxRowsToDisplay = 5

const rowsPerLoad = 50

let rowsToDisplay
$: rowsToDisplay = [...cloneDeep(rows).slice(0, maxRowsToDisplay)]

$: additionalRows = Math.max(rows.length - maxRowsToDisplay, 0)

const loadMore = () => {
  maxRowsToDisplay += rowsPerLoad
}

// Cast field in query preview response to number if specified by schema
$: {
  for (let i = 0; i < rowsToDisplay.length; i++) {
    let row = rowsToDisplay[i]
    for (let fieldName of Object.keys(schema)) {
      if (schema[fieldName] === "number" && !Number.isNaN(Number(row[fieldName]))) {
        row[fieldName] = Number(row[fieldName])
      } else {
        row[fieldName] = row[fieldName]?.toString()
      }
    }
  }
}
</script>

<div class="table">
  <Table {schema} data={rowsToDisplay} allowEditing={false} />
  {#if additionalRows > 0}
    <button class="show-more" type="button" on:click={loadMore}>Load more</button>
  {/if}
</div>

<style>
  .table :global(.spectrum-Table-cell),
  .show-more {
    min-width: 100px;
  }

  .show-more {
    display: flex;
    padding: 16px;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    transition: background-color 130ms ease-out;

    background-color: var(--spectrum-global-color-gray-50);
    border: 1px solid var(--spectrum-alias-border-color-mid);
    border-top: 0;
  }

  .show-more:hover {
    background-color: var(--spectrum-global-color-gray-100);
  }
</style>
