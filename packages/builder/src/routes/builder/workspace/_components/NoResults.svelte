<script lang="ts">
import { Button, Icon, Layout } from "@supertoolmake/bbui"

export let onCtaClick: () => void
export let ctaText: string
export let hideCta: boolean = false
</script>

<Layout alignContent="center" justifyItems="center">
  <div class="icon-container">
    <Icon
      name="browser"
      size="M"
      color="var(--spectrum-global-color-static-gray-50)"
    />
  </div>
  <slot />

  {#if !hideCta}
    <Button cta on:click={onCtaClick}>{ctaText}</Button>
  {/if}
</Layout>

<style>
  .icon-container {
    margin-top: 80px;
    padding: 4px;
    border-radius: 8px;
    border: 0.5px solid #c96442;
    background: #aa4321;
  }
</style>
