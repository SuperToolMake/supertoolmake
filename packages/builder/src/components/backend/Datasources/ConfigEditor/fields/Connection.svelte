<script lang="ts">
  import { Label, Icon } from "@budibase/bbui"
  import { createEventDispatcher } from "svelte"

  export let name
  export let value
  export let error
  export let placeholder
  export let defaultHideConnectionUrl: boolean | undefined = false
  export let size: "S" | "M" | "L" | "XL" = "L"

  const dispatch = createEventDispatcher()

  let isFocused = false
  let isHidden = defaultHideConnectionUrl
  let inputValue = ""

  $: {
    if (isHidden && value) {
      inputValue = "••••••••••••"
    } else {
      inputValue = value || ""
    }
  }

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

    if (!isHidden && connStr === "••••••••••••") {
      return
    }

    dispatch("change", connStr)

    const parsed = parseConnectionString(connStr)
    if (parsed) {
      dispatch("parsed", parsed)
    }
  }

  const handleFocus = () => {
    isFocused = true
  }

  const handleBlur = () => {
    isFocused = false
    dispatch("blur")
  }

  const toggleVisibility = () => {
    isHidden = !isHidden
    if (!isHidden && value) {
      inputValue = value
    } else if (isHidden && value) {
      inputValue = "••••••••••••"
    }
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
      class:spectrum-Textfield-input--large={size === "L"}
      value={inputValue}
      placeholder={placeholder ||
        "postgresql://user:password@host:5432/database"}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={handleBlur}
      readonly={isHidden}
    ></textarea>
    {#if !!value}
      <button
        class="visibility-toggle"
        on:click={toggleVisibility}
        type="button"
      >
        <Icon size="S" name={isHidden ? "eye-slash" : "eye"} />
      </button>
    {/if}
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
    position: relative;
    display: flex;
    align-items: center;
  }
  .spectrum-Textfield-input--large {
    max-width: 562px;
  }

  textarea {
    resize: none;
    min-height: 48px !important;
    padding-top: 12px !important;
    padding-bottom: 12px !important;
    field-sizing: content;
  }
  .visibility-toggle {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--spectrum-global-color-gray-600);
  }
  .visibility-toggle:hover {
    color: var(--spectrum-global-color-gray-800);
  }
  .error {
    color: var(--spectrum-global-color-red-600);
    font-size: var(--spectrum-global-color-red-600);
  }
</style>
