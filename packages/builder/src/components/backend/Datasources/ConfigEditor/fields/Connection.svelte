<script lang="ts">
  import { Label } from "@budibase/bbui"
  import { createEventDispatcher } from "svelte"

  export let name
  export let value
  export let error
  export let placeholder

  const dispatch = createEventDispatcher()

  let isFocused = false

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

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    const connStr = target.value
    dispatch("change", connStr)

    const parsed = parseConnectionString(connStr)
    if (parsed) {
      dispatch("parsed", parsed)
    }
  }

  const handleBlur = () => {
    isFocused = false
    dispatch("blur")
  }
</script>

<div class="connection-field">
  <Label>{name}</Label>
  <div
    class="spectrum-Textfield spectrum-Textfield--multiline"
    class:is-focused={isFocused}
    class:is-invalid={!!error}
  >
    <textarea
      class="spectrum-Textfield-input"
      {value}
      placeholder={placeholder ||
        "postgresql://user:password@host:5432/database"}
      on:input={handleInput}
      on:focus={() => (isFocused = true)}
      on:blur={handleBlur}
    ></textarea>
  </div>
  {#if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style>
  .connection-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-s);
  }
  .spectrum-Textfield {
    width: 100%;
  }
  textarea {
    width: 100%;
    resize: none;
    min-height: 48px !important;
    padding-top: 12px !important;
    padding-bottom: 12px !important;
    field-sizing: content;
  }
  .error {
    color: var(--spectrum-global-color-red-600);
    font-size: var(--spectrum-global-dimension-static-size-75);
  }
</style>
