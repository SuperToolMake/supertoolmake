<script>
  import Logo from "assets/supertoolmake-emblem.svg"
  import { goto } from "@roxi/routify"

  $goto
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<img
  src={Logo}
  alt="SuperToolMake Logo"
  on:click={() => $goto("./workspaces")}
/>

<style>
  img {
    width: 30px;
    height: 30px;
  }
</style>
