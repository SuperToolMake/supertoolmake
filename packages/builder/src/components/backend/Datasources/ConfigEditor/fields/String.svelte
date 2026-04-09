<script lang="ts">
import { Input, Label } from "@supertoolmake/bbui"

export let type
export let name
export let value
export let error
export let placeholder
</script>

<div class="form-row">
  <Label>{name}</Label>
  <Input
    on:blur
    on:change
    type={type === "password" ? "password" : "text"}
    {value}
    {error}
    {placeholder}
  />
</div>

<style>
  .form-row {
    display: grid;
    grid-template-columns: 20% 1fr;
    grid-gap: var(--spacing-l);
    align-items: center;
  }
</style>
