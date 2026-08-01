<script>
import { Input, Label, Select } from "@supertoolmake/bbui"

/**
 * This component takes the query object and populates the 'extra' property
 * when a datasource has specified a configuration for these fields in SCHEMA.extra
 */
export let populateExtraQuery
export let config
export let query

$: extraFields = Object.keys(config).map((key) => ({
  ...config[key],
  key,
}))

$: extraQueryFields = query.fields.extra || {}
</script>

<div class="extra-fields">
  {#each extraFields as { key, displayName, type }}
    <div class="extra-field">
      <Label>{displayName}</Label>
      {#if type === "string"}
        <Input
          on:change={() => populateExtraQuery(extraQueryFields)}
          bind:value={extraQueryFields[key]}
        />
      {/if}

      {#if type === "list"}
        <Select
          on:change={() => populateExtraQuery(extraQueryFields)}
          bind:value={extraQueryFields[key]}
          options={config[key].data[query.queryVerb]}
          getOptionLabel={current => current}
        />
      {/if}
    </div>
  {/each}
</div>

<style>
  .extra-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-l);
  }

  .extra-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .extra-field :global(.spectrum-Form-item) {
    width: 100%;
  }

  @media (max-width: 700px) {
    .extra-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
