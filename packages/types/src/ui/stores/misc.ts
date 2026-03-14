// type purely to capture structures that the type is unknown, but maybe known later
export type UIObject = Record<string, any>

export enum DropPosition {
  ABOVE = "above",
  BELOW = "below",
  INSIDE = "inside",
}
