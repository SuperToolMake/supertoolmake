<script>
import { routeStore } from "@/stores"
import Provider from "./Provider.svelte"
</script>

<Provider key="url" data={$routeStore.testUrlParams}>
  <slot />
</Provider>
