<script lang="ts">
  import { Label, Input } from "@budibase/bbui"
  import { createEventDispatcher } from "svelte"

  export let value
  export let error

  const dispatch = createEventDispatcher()

  let useDirectConnection = false

  $: useDirectConnection = !!value

  const parseConnectionString = (connStr: string) => {
    try {
      const url = new URL(connStr)
      return {
        host: url.hostname || "",
        port: url.port ? parseInt(url.port) : 5432,
        database: url.pathname.replace("/", "") || "postgres",
        user: url.username || "",
        password: url.password || "",
      }
    } catch {
      return null
    }
  }

  const handleInput = (e: CustomEvent) => {
    const connStr = e.detail
    dispatch("change", connStr)

    const parsed = parseConnectionString(connStr)
    if (parsed) {
      dispatch("parsed", parsed)
    }
  }
</script>

<div class="connection-field">
  <div class="input-row">
    <Label>Direct connection</Label>
    <Input
      on:blur
      on:change={handleInput}
      type="text"
      {value}
      {error}
      placeholder="postgresql://user:password@host:5432/database"
    />
  </div>
</div>

<style>
  .connection-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-m);
  }
  .input-row {
    display: grid;
    grid-template-columns: 20% 1fr;
    grid-gap: var(--spacing-l);
    align-items: center;
  }
</style>
