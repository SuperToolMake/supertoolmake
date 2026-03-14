import { notifications } from "@budibase/bbui"
import { get } from "svelte/store"
import { componentStore } from "@/stores/builder"

const getContextMenuItems = (component, showCopy) => {
  const noPaste = !get(componentStore).componentToPaste

  const storeComponentForCopy = (cut = false) => {
    componentStore.copy(component, cut)
  }

  const pasteComponent = (mode) => {
    try {
      componentStore.paste(component, mode)
    } catch (_error) {
      notifications.error("Error saving component")
    }
  }

  return [
    {
      icon: "copy",
      name: "Copy",
      keyBind: "Ctrl+C",
      visible: showCopy,
      disabled: false,
      callback: () => storeComponentForCopy(false),
    },
    {
      icon: "stack",
      name: "Paste",
      keyBind: "Ctrl+V",
      visible: true,
      disabled: noPaste,
      callback: () => pasteComponent("inside"),
    },
  ]
}

export default getContextMenuItems
