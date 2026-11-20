export enum Theme {
  LIGHTEST = "lightest",
  LIGHT = "light",
  DARK = "dark",
  DARKEST = "darkest",
  MIDNIGHT = "midnight",
}

export type ThemeMeta = {
  id: string
  name: string
  base?: Theme
}
