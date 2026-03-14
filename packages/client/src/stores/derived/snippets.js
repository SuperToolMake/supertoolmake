import { derivedMemo } from "@budibase/frontend-core"
import { appStore } from "../app"
import { builderStore } from "../builder"

export const snippets = derivedMemo([appStore, builderStore], ([$appStore, $builderStore]) => {
  return $builderStore?.snippets || $appStore?.application?.snippets || []
})
