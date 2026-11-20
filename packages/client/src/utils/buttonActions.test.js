// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

const { processFileUpload, saveRow, exportRows, getSelection, download } = vi.hoisted(() => ({
  processFileUpload: vi.fn(),
  saveRow: vi.fn(),
  exportRows: vi.fn(),
  getSelection: vi.fn(),
  download: vi.fn(),
}))

vi.mock("@/api", () => ({
  API: { saveRow, exportRows },
}))

vi.mock("downloadjs", () => ({ default: download }))

vi.mock("@/stores", async () => {
  const { writable } = await import("svelte/store")
  return {
    authStore: { actions: { logOut: vi.fn() } },
    builderStore: writable({ inBuilder: false }),
    confirmationStore: { actions: { showConfirmation: vi.fn() } },
    dataSourceStore: { actions: { invalidateDataSource: vi.fn() } },
    modalStore: { actions: { open: vi.fn(), close: vi.fn() } },
    notificationStore: {
      actions: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    },
    routeStore: { actions: { navigate: vi.fn() } },
    rowSelectionStore: { actions: { getSelection } },
    sidePanelStore: { actions: { open: vi.fn(), close: vi.fn() } },
    stateStore: writable({}),
    uploadStore: { actions: { processFileUpload } },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  getSelection.mockReturnValue(undefined)
})

vi.mock("@supertoolmake/frontend-core", () => ({
  downloadStream: vi.fn(),
}))

import { enrichButtonActions } from "./buttonActions"

const uploadActions = (parameters) => [
  {
    "##eventHandlerType": "Upload File to Bucket",
    id: "upload",
    parameters: { componentId: "fileupload-1", ...parameters },
  },
  {
    "##eventHandlerType": "Save Row",
    id: "save",
    parameters: { tableId: "orders" },
  },
]

const run = async (actions) => {
  await enrichButtonActions(actions, {})()
}

describe("upload file to bucket action", () => {
  it("stops subsequent actions when the upload fails", async () => {
    processFileUpload.mockResolvedValue(undefined)

    await run(uploadActions())

    expect(saveRow).not.toHaveBeenCalled()
  })

  it("continues subsequent actions when stop on error is disabled", async () => {
    processFileUpload.mockResolvedValue(undefined)

    await run(uploadActions({ stopOnError: false }))

    expect(saveRow).toHaveBeenCalled()
  })

  it("continues subsequent actions when no upload component is set", async () => {
    await run(uploadActions({ componentId: undefined }))

    expect(saveRow).toHaveBeenCalled()
  })

  it("continues subsequent actions when the upload succeeds", async () => {
    processFileUpload.mockResolvedValue({
      publicUrl: "https://example.com/file.png",
    })

    await run(uploadActions())

    expect(saveRow).toHaveBeenCalled()
  })
})

describe("export data action", () => {
  const exportQueryRows = async (format) => {
    const exportData = enrichButtonActions(
      [
        {
          "##eventHandlerType": "Export Data",
          parameters: {
            tableComponentId: "query-table",
            rows: [{ firstName: "John", lastName: "Connor" }],
            type: format,
            columns: [{ name: "firstName" }, { name: "lastName" }],
            delimiter: ",",
            customHeaders: {
              firstName: "First name",
              lastName: "Last name",
            },
          },
        },
      ],
      {}
    )

    await exportData()
    return download.mock.calls[0][0].text()
  }

  it.each([
    ["csv", "First name,Last name\nJohn,Connor"],
    ["json", JSON.stringify([{ "First name": "John", "Last name": "Connor" }], null, 2)],
  ])("exports query rows with custom %s labels", async (format, expected) => {
    await expect(exportQueryRows(format)).resolves.toBe(expected)
  })
})
