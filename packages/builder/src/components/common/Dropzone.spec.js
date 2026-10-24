import { notifications } from "@supertoolmake/bbui"
import { fireEvent, render } from "@testing-library/svelte"
import { writable } from "svelte/store"
import { describe, expect, it, vi } from "vitest"
import Dropzone from "./Dropzone.svelte"

vi.mock("@/stores/portal", async () => {
  return {
    admin: writable({}),
    auth: writable({}),
  }
})

vi.mock("@/stores/builder", async () => {
  return {
    workspaceAppStore: writable({}),
    appStore: writable({}),
  }
})

const notificationsErrorSpy = vi.spyOn(notifications, "error").mockImplementation(() => {})

describe("Dropzone", () => {
  let instance = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
  })

  it("that the Dropzone is rendered", () => {
    instance = render(Dropzone, {})
    expect(instance).toBeDefined()
  })

  it("does not apply hosted file size limits", async () => {
    instance = render(Dropzone, { props: { fileSizeLimit: 1000000 } }) // 1MB
    const fileInput = instance.getByLabelText("Click to select a file")
    const file = new File(["hello".repeat(2000000)], "hello.png", {
      type: "image/png",
    })
    await fireEvent.change(fileInput, { target: { files: [file] } })
    expect(notificationsErrorSpy).not.toHaveBeenCalled()
  })
})
