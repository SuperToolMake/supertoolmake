import { Constants } from "@budibase/frontend-core"
import type { Screen } from "@budibase/types"
import { get, writable } from "svelte/store"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { API } from "@/api"
import { appStore, componentStore, workspaceAppStore } from "@/stores/builder"
import { initialScreenState, ScreenStore } from "@/stores/builder/screens"
import {
  COMPONENT_DEFINITIONS,
  componentDefinitionMap,
  componentsToNested,
  createAppMetaState,
  createAppPackageResponse,
  getComponentFixture,
  getScreenDocId,
  getScreenFixture,
} from "./fixtures"

interface ScreenState {
  screens: Screen[]
  selectedScreenId?: string
}

interface BbContext {
  store: ScreenState
  screenStore: ScreenStore
}

declare module "vitest" {
  interface TestContext {
    bb: BbContext
  }
}

const COMP_PREFIX = "@budibase/standard-components"

vi.mock("@/stores/builder", async () => {
  const mockAppStore = writable()
  const mockComponentStore = writable()
  const mockLayoutStore = writable()

  const componentStore = {
    getDefinition: vi.fn(),
    enrichEmptySettings: vi.fn(),
    update: mockComponentStore.update,
    subscribe: mockComponentStore.subscribe,
  }

  const appStore = {
    subscribe: mockAppStore.subscribe,
    update: mockAppStore.update,
    set: mockAppStore.set,
    refresh: vi.fn(),
    refreshAppNav: vi.fn(),
  }

  const navigationStore = {
    deleteLink: vi.fn(),
  }

  const workspaceAppStore = {
    refresh: vi.fn(),
  }

  return {
    componentStore,
    appStore,
    navigationStore,
    layoutStore: {
      update: mockLayoutStore.update,
      subscribe: mockComponentStore.subscribe,
    },
    workspaceAppStore,
  }
})

vi.mock("@/stores/builder/components/utils", () => {
  return {
    findAllMatchingComponents: vi.fn().mockImplementation(() => {
      return []
    }),
  }
})

vi.mock("@/api", () => {
  return {
    API: {
      fetchAppPackage: vi.fn(),
      fetchAppRoutes: vi.fn(),
      saveScreen: vi.fn(),
      deleteScreen: vi.fn(),
    },
  }
})

describe("Screens store", () => {
  beforeEach(async (ctx) => {
    vi.clearAllMocks()

    const screenStore = new ScreenStore()
    ctx.bb = {
      get store() {
        return get(screenStore)
      },
      screenStore,
    }
  })

  it("Create base screen store with defaults", ({ bb }) => {
    expect(bb.store).toStrictEqual(initialScreenState)
  })

  it("Syncs all screens from the app package", ({ bb }) => {
    expect(bb.store.screens.length).toBe(0)

    const screens = [...new Array(2)].map(() => getScreenFixture().json())

    bb.screenStore.syncAppScreens(createAppPackageResponse(screens))

    expect(bb.store.screens).toStrictEqual(screens)
  })

  it("Reset the screen store back to the default state", ({ bb }) => {
    expect(bb.store.screens.length).toBe(0)

    const screens = [...new Array(2)].map(() => getScreenFixture().json())

    bb.screenStore.syncAppScreens(createAppPackageResponse(screens))
    expect(bb.store.screens).toStrictEqual(screens)

    bb.screenStore.update((state) => ({
      ...state,
      selectedScreenId: screens[0]._id,
    }))

    bb.screenStore.reset()

    expect(bb.store).toStrictEqual(initialScreenState)
  })

  it("Marks a valid screen as selected", ({ bb }) => {
    const screens = [...new Array(2)].map(() => getScreenFixture().json())

    bb.screenStore.syncAppScreens(createAppPackageResponse(screens))
    expect(bb.store.screens.length).toBe(2)

    bb.screenStore.select(screens[0]._id!)

    expect(bb.store.selectedScreenId).toEqual(screens[0]._id)
  })

  it("Skip selecting a screen if it is not present", ({ bb }) => {
    const screens = [...new Array(2)].map(() => getScreenFixture().json())

    bb.screenStore.syncAppScreens(createAppPackageResponse(screens))
    expect(bb.store.screens.length).toBe(2)

    bb.screenStore.select("screen_abc")

    expect(bb.store.selectedScreenId).toBeUndefined()
  })

  it("Approve a valid empty screen config", ({ bb }) => {
    const coreScreen = getScreenFixture()
    bb.screenStore.validate(coreScreen.json())
  })

  it("Approve a valid screen config with one component and no illegal children", ({ bb }) => {
    const coreScreen = getScreenFixture()
    const formBlock = getComponentFixture(`${COMP_PREFIX}/formblock`)

    coreScreen.addChild(formBlock!)

    const defSpy = vi.spyOn(componentStore, "getDefinition")
    defSpy.mockReturnValueOnce(COMPONENT_DEFINITIONS.formblock)

    bb.screenStore.validate(coreScreen.json())

    expect(defSpy).toHaveBeenCalled()
  })

  it("Reject an attempt to nest invalid components", ({ bb }) => {
    const coreScreen = getScreenFixture()

    const formOne = getComponentFixture(`${COMP_PREFIX}/form`)!
    const formTwo = getComponentFixture(`${COMP_PREFIX}/form`)!

    formOne.addChild(formTwo)
    coreScreen.addChild(formOne)

    const defSpy = vi.spyOn(componentStore, "getDefinition").mockImplementation((comp) => {
      const defMap = componentDefinitionMap()
      return defMap[comp]
    })

    expect(() => bb.screenStore.validate(coreScreen.json())).toThrowError(
      `You can't place a ${COMPONENT_DEFINITIONS.form.name} here`
    )

    expect(defSpy).toHaveBeenCalled()
  })

  it("Reject an attempt to deeply nest invalid components", ({ bb }) => {
    const coreScreen = getScreenFixture()

    const formOne = getComponentFixture(`${COMP_PREFIX}/form`)!
    const formTwo = getComponentFixture(`${COMP_PREFIX}/form`)!

    const components = [...new Array(10)].map(
      () => getComponentFixture(`${COMP_PREFIX}/container`)!
    )

    components.splice(5, 0, formOne)
    components.push(formTwo)

    const nested = componentsToNested(components)!

    coreScreen.addChild(nested)

    const defSpy = vi.spyOn(componentStore, "getDefinition").mockImplementation((comp) => {
      const defMap = componentDefinitionMap()
      return defMap[comp]
    })

    expect(() => bb.screenStore.validate(coreScreen.json())).toThrowError(
      `You can't place a ${COMPONENT_DEFINITIONS.form.name} here`
    )

    expect(defSpy).toHaveBeenCalled()
  })

  it("Save a brand new screen and add it to the store. No validation", async ({ bb }) => {
    const coreScreen = getScreenFixture()
    const formOne = getComponentFixture(`${COMP_PREFIX}/form`)!

    coreScreen.addChild(formOne)

    appStore.set(createAppMetaState({ features: { componentValidation: false } }))

    expect(bb.store.screens.length).toBe(0)

    const newDocId = getScreenDocId()
    const newDoc = { ...coreScreen.json(), _id: newDocId }

    const saveSpy = vi.spyOn(API, "saveScreen").mockResolvedValue(newDoc)
    vi.spyOn(API, "fetchAppRoutes").mockResolvedValue({
      routes: [],
    } as any)
    await bb.screenStore.save(coreScreen.json())

    expect(saveSpy).toHaveBeenCalled()

    expect(bb.store.screens.length).toBe(1)

    expect(bb.store.screens[0]).toStrictEqual({
      ...newDoc,
    })

    expect(bb.store.selectedScreenId).toBe(newDocId)

    expect(get(componentStore).selectedComponentId).toBe(coreScreen.json().props._id)
  })

  it("Sync an updated screen to the screen store on save", async ({ bb }) => {
    const existingScreens = [...new Array(4)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    bb.screenStore.update((state) => ({
      ...state,
      screens: existingScreens.map((screen) => screen.json()),
    }))

    const form = getComponentFixture(`${COMP_PREFIX}/form`)!
    existingScreens[2].addChild(form)

    const saveSpy = vi.spyOn(API, "saveScreen").mockResolvedValue(existingScreens[2].json())

    await bb.screenStore.save(existingScreens[2].json())

    expect(appStore.refreshAppNav).toHaveBeenCalledOnce()
    expect(saveSpy).toHaveBeenCalled()

    expect(bb.store.screens[2]).toStrictEqual(existingScreens[2].json())
  })

  it("Proceed to patch if appropriate config are supplied", async ({ bb }) => {
    vi.spyOn(bb.screenStore, "sequentialScreenPatch").mockImplementation(async () => undefined)
    const noop = () => {}

    await bb.screenStore.patch(noop, "test")
    expect(bb.screenStore.sequentialScreenPatch).toHaveBeenCalledWith(noop, "test")
  })

  it("Replace an existing screen with a new version of itself", ({ bb }) => {
    const existingScreens = [...new Array(4)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    bb.screenStore.update((state) => ({
      ...state,
      screens: existingScreens.map((screen) => screen.json()),
    }))

    const formBlock = getComponentFixture(`${COMP_PREFIX}/formblock`)!
    existingScreens[2].addChild(formBlock)

    bb.screenStore.replace(existingScreens[2]._json._id!, existingScreens[2].json())

    expect(bb.store.screens.length).toBe(4)
  })

  it("Add a screen when attempting to replace one not present in the store", ({ bb }) => {
    const existingScreens = [...new Array(4)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    bb.screenStore.update((state) => ({
      ...state,
      screens: existingScreens.map((screen) => screen.json()),
    }))

    const newScreenDoc = getScreenFixture()
    newScreenDoc._json._id = getScreenDocId()

    bb.screenStore.replace(newScreenDoc._json._id, newScreenDoc.json())

    expect(bb.store.screens.length).toBe(5)
    expect(bb.store.screens[4]).toStrictEqual(newScreenDoc.json())
  })

  it("Delete a single screen and remove it from the store", async ({ bb }) => {
    const existingScreens = [...new Array(3)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    bb.screenStore.update((state) => ({
      ...state,
      screens: existingScreens.map((screen) => screen.json()),
    }))

    const deleteSpy = vi.spyOn(API, "deleteScreen")
    const refreshWorkspaceAppSpy = vi.spyOn(workspaceAppStore, "refresh")

    await bb.screenStore.delete(existingScreens[2].json())

    vi.spyOn(API, "fetchAppRoutes").mockResolvedValue({
      routes: [] as any,
    })

    expect(deleteSpy).toBeCalled()
    expect(refreshWorkspaceAppSpy).toHaveBeenCalledOnce()

    expect(bb.store.screens.length).toBe(2)

    expect(get(appStore).routes).toEqual([])
  })

  it("Upon delete, select the first screen", async ({ bb }) => {
    const existingScreens = [...new Array(3)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    bb.screenStore.update((state) => ({
      ...state,
      screens: existingScreens.map((screen) => screen.json()),
      selectedScreenId: existingScreens[2]._json._id,
    }))

    componentStore.update((state) => ({
      ...state,
      selectedComponentId: existingScreens[2]._json._id,
    }))

    await bb.screenStore.delete(existingScreens[2].json())

    expect(bb.store.screens.length).toBe(2)
    expect(get(componentStore).selectedComponentId).toBeUndefined()
    expect(bb.store.selectedScreenId).toBe(existingScreens[0]._json._id)
  })

  it("Update a screen setting", async ({ bb }) => {
    const screenDoc = getScreenFixture()
    const existingDocId = getScreenDocId()
    screenDoc._json._id = existingDocId

    await bb.screenStore.update((state) => ({
      ...state,
      screens: [screenDoc.json()],
    }))

    const patchedDoc = screenDoc.json()
    const patchSpy = vi.spyOn(bb.screenStore, "patch").mockImplementation(async (patchFn) => {
      patchFn(patchedDoc)
      return undefined
    })

    await bb.screenStore.updateSetting(patchedDoc, "showNavigation", false)

    expect(patchSpy).toBeCalled()
    expect(patchedDoc.showNavigation).toBe(false)
  })

  it("Ensure only one homescreen per role after updating setting. All screens same role", async ({
    bb,
  }) => {
    const existingScreens = [...new Array(3)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    const storeScreens = existingScreens
      .map((screen) => screen.json())
      .filter((screen) => screen.routing.roleId == Constants.Roles.BASIC)

    expect(storeScreens.length).toBe(3)

    storeScreens[1].routing.homeScreen = true

    await bb.screenStore.update((state) => ({
      ...state,
      screens: storeScreens,
    }))

    const patchMock: any = async (patchFn: any, screenId: any) => {
      const target = bb.store.screens.find((screen) => screen._id === screenId)
      patchFn(target!)

      await bb.screenStore.replace(screenId!, target!)
    }
    vi.spyOn(bb.screenStore, "patch").mockImplementation(patchMock)

    await bb.screenStore.updateSetting(storeScreens[0], "routing.homeScreen", true)

    expect(bb.store.screens[0].routing.homeScreen).toBe(true)

    expect(bb.store.screens[1].routing.homeScreen).toBe(false)
  })

  it("Does not unset home screen when updating route on another screen", async ({ bb }) => {
    const existingScreens = [...new Array(3)].map(() => {
      const screenDoc = getScreenFixture()
      const existingDocId = getScreenDocId()
      screenDoc._json._id = existingDocId
      return screenDoc
    })

    const storeScreens = existingScreens.map((screen) => screen.json())
    storeScreens[1].routing.homeScreen = true

    await bb.screenStore.update((state) => ({
      ...state,
      screens: storeScreens,
    }))

    const patchMock2: any = async (patchFn: any, screenId: any) => {
      const target = bb.store.screens.find((screen) => screen._id === screenId)
      patchFn(target!)

      await bb.screenStore.replace(screenId!, target!)
    }
    vi.spyOn(bb.screenStore, "patch").mockImplementation(patchMock2)

    await bb.screenStore.updateSetting(storeScreens[0], "routing.route", "/updated-route")

    expect(bb.store.screens[0].routing.route).toBe("/updated-route")
    expect(bb.store.screens[1].routing.homeScreen).toBe(true)
  })

  it("Sequential patch check. Exit if the screenId is not valid.", async ({ bb }) => {
    const screenDoc = getScreenFixture()
    const existingDocId = getScreenDocId()
    screenDoc._json._id = existingDocId

    const original = screenDoc.json()

    await bb.screenStore.update((state) => ({
      ...state,
      screens: [original],
    }))

    const saveMock: any = async () => {
      return undefined
    }
    const saveSpy = vi.spyOn(bb.screenStore, "save").mockImplementation(saveMock)

    await bb.screenStore.sequentialScreenPatch(() => false, "123")
    expect(saveSpy).not.toBeCalled()
  })

  it("Sequential patch check. Exit if the patchFn result is false", async ({ bb }) => {
    const screenDoc = getScreenFixture()
    const existingDocId = getScreenDocId()
    screenDoc._json._id = existingDocId

    const original = screenDoc.json()
    await bb.screenStore.update((state) => ({
      ...state,
      screens: [original],
    }))

    const saveMock2: any = async () => {
      return undefined
    }
    const saveSpy = vi.spyOn(bb.screenStore, "save").mockImplementation(saveMock2)

    await bb.screenStore.sequentialScreenPatch(() => {
      return false
    }, "123")

    expect(saveSpy).not.toBeCalled()
  })

  it("Sequential patch check. Patch applied and save requested", async ({ bb }) => {
    const screenDoc = getScreenFixture()
    const existingDocId = getScreenDocId()
    screenDoc._json._id = existingDocId

    const original = screenDoc.json()

    await bb.screenStore.update((state) => ({
      ...state,
      screens: [original],
    }))

    const saveMock3: any = async () => {
      return undefined
    }
    const saveSpy = vi.spyOn(bb.screenStore, "save").mockImplementation(saveMock3)

    await bb.screenStore.sequentialScreenPatch((screen: Screen) => {
      screen.name = "updated"
      return true
    }, existingDocId)

    expect(saveSpy).toBeCalledWith({
      ...original,
      name: "updated",
    })
  })
})
