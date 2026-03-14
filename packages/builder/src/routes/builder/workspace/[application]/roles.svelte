<script>
import RoleEditor from "@/components/backend/RoleEditor/RoleEditor.svelte"
import { builderStore } from "@/stores/builder"

builderStore.selectResource("roles")
</script>

<div class="content">
  <RoleEditor />
</div>

<style>
  .content {
    padding: 28px 40px 40px 40px;
    overflow-y: auto;
    gap: var(--spacing-l);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    flex: 1 1 auto;
    z-index: 2;
    position: relative;
  }
</style>
