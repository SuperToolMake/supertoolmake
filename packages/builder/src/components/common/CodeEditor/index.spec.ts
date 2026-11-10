import type { EnrichedBinding } from "@supertoolmake/types"
import { describe, expect, it } from "vitest"
import { bindingsToCompletions } from "."

describe("binding completion section headers", () => {
  it("renders category names and icon attributes as text", () => {
    const category = '<img src=x onerror="alert(1)">'
    const binding: EnrichedBinding = {
      category,
      icon: 'code" onmouseover="alert(1)',
      readableBinding: "value",
      runtimeBinding: "value",
    }
    const [completion] = bindingsToCompletions([binding], { name: "handlebars" })
    const section = completion.section
    if (!section || typeof section === "string" || !section.header) {
      throw new Error("Missing completion section header")
    }
    const header = section.header(section)
    expect(header.textContent).toBe(category)
    expect(header.querySelector("img")).toBeNull()
    expect(header.querySelector("i")?.hasAttribute("onmouseover")).toBe(false)
  })
})
