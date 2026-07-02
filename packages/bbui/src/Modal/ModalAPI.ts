import type { ModalCancelFrom } from "../constants"

export interface ModalAPI {
  show: () => void
  hide: () => void
  toggle: () => void
  cancel: (_: ModalCancelFrom) => void
}
