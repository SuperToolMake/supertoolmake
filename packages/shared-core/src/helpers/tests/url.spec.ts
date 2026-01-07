import { builderWorkspacesUrl } from "../url"

const BASE = "https://budibase.com"

describe("url helpers", () => {
  describe("builder", () => {
    it("normalizes base when joining", () => {
      const url = builderWorkspacesUrl(`${BASE}/`)
      expect(url).toEqual(`${BASE}/builder/workspaces`)
    })
  })
})
