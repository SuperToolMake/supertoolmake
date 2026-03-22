<script>
import { Body } from "@budibase/bbui"

export let title
export let disabled
export let large = false
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div on:click class:disabled class="option" class:large>
  <div class="header">
    <div class="icon">
      <slot />
    </div>
    <Body size="S" color="var(--spectrum-global-color-gray-900)">{title}</Body>
  </div>
</div>

<style>
  .option {
    background-color: var(--background);
    border: 0.5px solid var(--spectrum-global-color-gray-200);
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
  }

  .option :global(label) {
    cursor: pointer;
  }

  .option:hover {
    background-color: var(--background-alt);
  }

  .header {
    display: flex;
    align-items: center;
  }

  .icon {
    display: flex;
    margin-right: 8px;
  }

  .header :global(p) {
    margin: 0;
  }

  .disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .large {
    padding: 20px 24px;
  }

  .large :global(p) {
    font-size: 1rem;
  }
</style>
