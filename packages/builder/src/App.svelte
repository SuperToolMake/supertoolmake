<script>
import { onMount } from "svelte"
import { BannerDisplay, Context, NotificationDisplay } from "@budibase/bbui"
import { Router } from "@roxi/routify"
import { parse, stringify } from "qs"
import { setContext } from "svelte"
import routes from "../.routify/routes.default.js"

const queryHandler = { parse, stringify }

setContext(Context.PopoverRoot, "body")

onMount(() => {
  const links = ["https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/duotone/style.css"]
  for (const href of links) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    document.head.appendChild(link)
  }
})
</script>

<div class="banner-container"></div>

<Router {routes} config={{ queryHandler }} />
<BannerDisplay />
<NotificationDisplay />

<div class="modal-container"></div>

<style>
  .modal-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999;
  }
  .modal-container :global(*) {
    pointer-events: auto;
  }
</style>
