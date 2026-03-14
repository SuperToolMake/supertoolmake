<script>
import { ModalContent, Select } from "@budibase/bbui"
import { ThemeOptions } from "@budibase/shared-core"
import { themeStore } from "@/stores/portal"
</script>

<ModalContent title="Theme">
  <Select
    options={ThemeOptions}
    bind:value={$themeStore.theme}
    placeholder={null}
    getOptionLabel={x => x.name}
    getOptionValue={x => x.id}
  />
</ModalContent>
