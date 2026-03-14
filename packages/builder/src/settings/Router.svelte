<script lang="ts">
import { memo } from "@budibase/frontend-core"
import type { Component } from "svelte"
import { setContext } from "svelte"
import { writable } from "svelte/store"
import type { MatchedRoute, Routing } from "@/types/routing"

export let route: MatchedRoute | undefined = undefined

const memoRoute = memo<MatchedRoute | undefined>(route)

// Routing context
const routing = writable<Routing>({})
setContext("routing", routing)

// Load the comp
let page: Component<Record<string, unknown>> | undefined

$: memoRoute.set(route)

$: entry = $memoRoute?.entry
$: path = entry?.path
$: comp = entry?.comp

$: params = { ...($memoRoute?.params || {}) }
$: routing.update((state) => ({ ...state, params: { ...params } }))

$: if (path && comp) {
  page = comp
}
</script>

{#if page}
  {#key path}
    <svelte:component this={page} />
  {/key}
{/if}
