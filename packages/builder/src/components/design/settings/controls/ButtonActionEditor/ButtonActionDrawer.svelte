<script>
import {
  ActionButton,
  Button,
  Drawer,
  DrawerContent,
  Icon,
  Layout,
  Search,
} from "@supertoolmake/bbui"
import { cloneDeep } from "lodash/fp"
import { generate } from "shortid"
import { tick } from "svelte"
import { dndzone } from "svelte-dnd-action"
import {
  getActionBindings,
  getEventContextBindings,
  makeStateBinding,
  updateReferencesInObject,
} from "@/dataBinding"
import { getAvailableActions } from "./index"

const EVENT_TYPE_KEY = "##eventHandlerType"
const IF_TYPE = "IF / ELSE"
const actionTypes = getAvailableActions()
const flipDurationMs = 150
const zoneType = generate()

export let key
export let actions
export let bindings = []
export let nested
export let componentInstance

let actionQuery
let selectedAction = actions?.length ? actions[0] : null
let originalActionIndex
let draggingActionId
let draggingIFBlock = false
let topLevelDragSnapshot
let topLevelDraggedAction
let branchAddQuery = ""

let branchDrawer
let branchDrawerMode = null // "picker" | "editor"
let branchDrawerAction = null
let branchDrawerKey = null // "actions" | "elseActions"
let branchDrawerDraft = null
let branchDrawerIsNew = false

const openBranchAddDrawer = (branchKey) => {
  branchDrawerKey = branchKey
  branchDrawerMode = "picker"
  branchDrawerAction = null
  branchAddQuery = ""
  branchDrawer.show()
}

const openBranchActionDrawer = (action, branchKey) => {
  branchDrawerKey = branchKey
  branchDrawerMode = "editor"
  branchDrawerAction = action
  branchDrawerDraft = cloneDeep(action.parameters || {})
  branchDrawerIsNew = false
  branchDrawer.show()
}

const onBranchPickerSelect = (actionType) => {
  const newAction = {
    parameters: {},
    [EVENT_TYPE_KEY]: actionType.name,
    id: generate(),
  }
  if (isIFBlock(newAction)) {
    newAction.parameters.actions = []
    newAction.parameters.elseActions = []
  }
  branchDrawerMode = "editor"
  branchDrawerAction = newAction
  branchDrawerDraft = cloneDeep(newAction.parameters)
  branchDrawerIsNew = true
}

const saveBranchAction = () => {
  if (branchDrawerMode === "editor" && branchDrawerAction) {
    if (branchDrawerIsNew) {
      const ifAction = activeIfAction
      const branchKey = branchDrawerKey
      if (!ifAction.parameters) ifAction.parameters = {}
      if (!ifAction.parameters[branchKey]) ifAction.parameters[branchKey] = []
      branchDrawerAction.parameters = branchDrawerDraft
      ifAction.parameters[branchKey] = [...ifAction.parameters[branchKey], branchDrawerAction]
      actions = [...actions]
      selectedAction = branchDrawerAction
    } else {
      branchDrawerAction.parameters = branchDrawerDraft
      actions = [...actions]
    }
  }
  branchDrawer.hide()
}

const isIFBlock = (action) => {
  return action?.[EVENT_TYPE_KEY] === IF_TYPE
}

const setUpdateActions = (actions) => {
  return actions
    ? cloneDeep(actions)
        .filter(
          (a) =>
            a[EVENT_TYPE_KEY] === "Update State" && a.parameters?.type === "set" && a.parameters.key
        )
        .reduce((acc, a) => {
          acc[a.id] = a
          return acc
        }, {})
    : []
}

let updateStateActions = setUpdateActions(actions)

const recordOriginalActionIndex = (id) => {
  if (!(actions && id)) return
  if (draggingActionId !== id) {
    draggingActionId = id
    originalActionIndex = -1
    topLevelDragSnapshot = actions
    topLevelDraggedAction = actions.find((action) => action.id === id)
  }
  if (originalActionIndex >= 0) return
  const index = actions.findIndex((action) => action.id === id)
  if (index !== -1) originalActionIndex = index
}

const resetDragState = () => {
  originalActionIndex = -1
  draggingActionId = undefined
  topLevelDragSnapshot = undefined
  topLevelDraggedAction = undefined
}

const isDraggingIFAction = (id) => {
  return (
    draggingIFBlock ||
    isIFBlock(topLevelDraggedAction) ||
    actions?.some((action) => action.id === id && isIFBlock(action))
  )
}

const restoreTopLevelDragSnapshot = () => {
  if (topLevelDragSnapshot) {
    actions = topLevelDragSnapshot
  }
}

function handleDndConsider(e) {
  recordOriginalActionIndex(e.detail.info.id)
  const wasIFBlock = isDraggingIFAction(e.detail.info.id)
  if (!draggingIFBlock && wasIFBlock) {
    draggingIFBlock = true
  }
  if (wasIFBlock && e.detail.info.trigger === "draggedEnteredAnother") {
    restoreTopLevelDragSnapshot()
    return
  }
  actions = e.detail.items
}

function handleDndFinalize(e) {
  const wasIFBlock = draggingIFBlock
  draggingIFBlock = false

  if (wasIFBlock && e.detail.info.trigger === "droppedIntoAnother") {
    restoreTopLevelDragSnapshot()
    resetDragState()
    return
  }
  actions = e.detail.items
  if (e.detail.info.trigger !== "droppedIntoAnother") {
    updateReferencesInObject({
      obj: actions,
      modifiedIndex: actions.findIndex((action) => action.id === e.detail.info.id),
      action: "move",
      label: "actions",
      originalIndex: originalActionIndex,
    })
  }
  resetDragState()
}

function handleBranchConsider(e, ifActionId, branchKey) {
  const draggedItem = e.detail.items.find((item) => item.id === e.detail.info.id)
  if (isDraggingIFAction(e.detail.info.id) || isIFBlock(draggedItem)) {
    restoreTopLevelDragSnapshot()
    return
  }
  const ifAction = actions.find((a) => a.id === ifActionId)
  if (ifAction?.parameters) {
    ifAction.parameters[branchKey] = e.detail.items
    actions = [...actions]
  }
}

function handleBranchFinalize(e, ifActionId, branchKey) {
  const draggedItem = e.detail.items.find((item) => item.id === e.detail.info.id)
  if (isDraggingIFAction(e.detail.info.id) || isIFBlock(draggedItem)) {
    restoreTopLevelDragSnapshot()
    return
  }
  const ifAction = actions.find((a) => a.id === ifActionId)
  if (ifAction?.parameters) {
    ifAction.parameters[branchKey] = e.detail.items
    actions = [...actions]
  }
}

const deleteAction = (index) => {
  const selectedIndex = actions.indexOf(selectedAction)
  const isSelected = index === selectedIndex
  actions.splice(index, 1)
  actions = [...actions]
  if (isSelected) selectedAction = actions?.length ? actions[0] : null
  updateReferencesInObject({
    obj: actions,
    modifiedIndex: index,
    action: "delete",
    label: "actions",
  })
}

const deleteBranchAction = (ifAction, branchKey, actionId) => {
  const branchArr = ifAction.parameters?.[branchKey] || []
  const idx = branchArr.findIndex((a) => a.id === actionId)
  if (idx !== -1) {
    if (selectedAction === branchArr[idx]) selectedAction = ifAction
    branchArr.splice(idx, 1)
    ifAction.parameters[branchKey] = [...branchArr]
    actions = [...actions]
  }
}

const getBranchActionCount = (action) => {
  if (!isIFBlock(action)) return 0
  return (action.parameters?.actions?.length || 0) + (action.parameters?.elseActions?.length || 0)
}

const toggleActionList = () => {
  actionQuery = null
  showAvailableActions = !showAvailableActions
}

const addAction = (actionType) => {
  const newAction = {
    parameters: {},
    [EVENT_TYPE_KEY]: actionType.name,
    id: generate(),
  }
  if (isIFBlock(newAction)) {
    newAction.parameters.actions = []
    newAction.parameters.elseActions = []
  }
  if (!actions) actions = []
  actions = [...actions, newAction]
  selectedAction = newAction
  updateStateActions = setUpdateActions(actions)
}

const addBranchAction = (ifAction, branchKey, actionType) => {
  const newAction = {
    parameters: {},
    [EVENT_TYPE_KEY]: actionType.name,
    id: generate(),
  }
  if (!ifAction.parameters) ifAction.parameters = {}
  if (!ifAction.parameters[branchKey]) ifAction.parameters[branchKey] = []
  ifAction.parameters[branchKey] = [...ifAction.parameters[branchKey], newAction]
  actions = [...actions]
  branchAddQuery = ""
  selectedAction = newAction
}

const selectAction = async (action) => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  await tick()
  selectedAction = action
  originalActionIndex = actions.findIndex((item) => item.id === action.id)
}

const getAllBindings = (actionBindings, eventContextBindings, actions) => {
  let allBindings = []
  let cloneActionBindings = cloneDeep(actionBindings)
  if (!actions) return []

  const flattenedActions = []
  ;(actions || []).forEach((action) => {
    flattenedActions.push(action)
    if (isIFBlock(action)) {
      ;(action.parameters?.actions || []).forEach((child) => flattenedActions.push(child))
      ;(action.parameters?.elseActions || []).forEach((child) => flattenedActions.push(child))
    }
  })

  flattenedActions
    .filter(
      (a) =>
        a[EVENT_TYPE_KEY] === "Update State" && a.parameters?.type === "set" && a.parameters.key
    )
    .forEach((action) => {
      const stateBinding = makeStateBinding(action.parameters.key)
      const hasKey = actionBindings.some((b) => b.runtimeBinding === stateBinding.runtimeBinding)
      if (!hasKey) {
        let existing = updateStateActions[action.id]
        if (existing) {
          const existingBinding = makeStateBinding(existing.parameters.key)
          cloneActionBindings = cloneActionBindings.filter(
            (b) => b.runtimeBinding !== existingBinding.runtimeBinding
          )
        }
        allBindings.push(stateBinding)
      }
    })

  const asyncAutoIndexes = flattenedActions
    .map((a, i) =>
      a[EVENT_TYPE_KEY] === "Trigger Automation" && !a.parameters?.synchronous ? i : undefined
    )
    .filter((i) => i !== undefined)

  let contextBindings = asyncAutoIndexes.length
    ? eventContextBindings.filter((_b, i) => !asyncAutoIndexes.includes(i))
    : eventContextBindings

  allBindings = contextBindings.concat(cloneActionBindings).concat(allBindings)
  return allBindings
}

const toDisplay = (eventKey) => {
  const type = actionTypes.find((a) => a.name == eventKey)
  return type?.displayName || type?.name
}

const findBranchActionById = (actions, id) => {
  for (const action of actions || []) {
    if (action.id === id) return action
    if (isIFBlock(action)) {
      for (const key of ["actions", "elseActions"]) {
        const found = (action.parameters?.[key] || []).find((a) => a.id === id)
        if (found) return found
      }
    }
  }
  return null
}

const findParentIfAction = (actions, childId) => {
  if (!actions || !childId) return null
  for (const action of actions) {
    if (!isIFBlock(action)) continue
    for (const key of ["actions", "elseActions"]) {
      if ((action.parameters?.[key] || []).some((a) => a.id === childId)) {
        return action
      }
    }
  }
  return null
}

$: branchDrawerComponent =
  branchDrawerMode === "editor" && branchDrawerAction
    ? actionTypes.find((t) => t.name === branchDrawerAction[EVENT_TYPE_KEY])?.component
    : null

$: branchDrawerTitle =
  branchDrawerMode === "picker"
    ? "Add Action"
    : branchDrawerMode === "editor" && branchDrawerAction
      ? `Edit: ${toDisplay(branchDrawerAction[EVENT_TYPE_KEY])}`
      : "Actions"

$: {
  if (selectedAction && !selectedAction.parameters) selectedAction.parameters = {}
}
$: parsedQuery = typeof actionQuery === "string" ? actionQuery.toLowerCase().trim() : ""
$: showAvailableActions = !actions?.length
$: mappedActionTypes = actionTypes.reduce((acc, action) => {
  let pn = action.name.toLowerCase().trim()
  if (parsedQuery.length && pn.indexOf(parsedQuery) < 0) return acc
  acc[action.type] = acc[action.type] || []
  acc[action.type].push(action)
  return acc
}, {})

$: branchParsedQuery = typeof branchAddQuery === "string" ? branchAddQuery.toLowerCase().trim() : ""
$: branchMappedActionTypes = actionTypes.reduce((acc, action) => {
  if (action.name === IF_TYPE) return acc
  let pn = action.name.toLowerCase().trim()
  if (branchParsedQuery.length && pn.indexOf(branchParsedQuery) < 0) return acc
  acc[action.type] = acc[action.type] || []
  acc[action.type].push(action)
  return acc
}, {})

$: eventContextBindings = getEventContextBindings({ componentInstance, settingKey: key })
$: actionContextBindings = getActionBindings(actions, selectedAction?.id)

$: allBindings = getAllBindings(
  bindings,
  [...eventContextBindings, ...actionContextBindings],
  actions
)

$: {
  if (actions) {
    actions.forEach((action) => {
      if (!action.id) action.id = generate()
    })
  }
}
$: selectedActionComponent =
  selectedAction && actionTypes.find((t) => t.name === selectedAction[EVENT_TYPE_KEY])?.component

$: {
  if (!draggingIFBlock && selectedAction && actions && !actions.includes(selectedAction)) {
    const found = findBranchActionById(actions, selectedAction.id)
    if (!found) selectedAction = actions?.[0]
  }
}

$: activeIfAction = isIFBlock(selectedAction)
  ? selectedAction
  : findParentIfAction(actions, selectedAction?.id)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions-->
<DrawerContent>
  <Layout noPadding gap="S" slot="sidebar">
    {#if showAvailableActions || !actions?.length}
      <div class="actions-list">
        {#if actions?.length > 0}
          <div>
            <ActionButton secondary icon={"ArrowLeft"} on:click={toggleActionList}>
              Back
            </ActionButton>
          </div>
        {/if}
        <div class="search-wrap">
          <Search placeholder="Search" bind:value={actionQuery} />
        </div>
        {#each Object.entries(mappedActionTypes) as [categoryId, category], idx}
          <div class="heading" class:top-entry={idx === 0}>{categoryId}</div>
          <ul>
            {#each category as actionType}
              <li on:click={() => addAction(actionType)}>
                <span class="action-name">{actionType.displayName || actionType.name}</span>
              </li>
            {/each}
          </ul>
        {/each}
      </div>
    {/if}

    {#if actions && actions.length > 0 && !showAvailableActions}
      <div>
        <Button secondary on:click={toggleActionList}>Add Action</Button>
      </div>

      <div
        class="actions"
        use:dndzone={{
          items: actions,
          flipDurationMs,
          dropTargetStyle: { outline: "none" },
          type: zoneType,
          dropFromOthersDisabled: false,
        }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}>
        {#each actions as action, index (action.id)}
          {#if isIFBlock(action)}
            <div class="if-block-wrapper" data-dnd-item={action.id}>
              <div
                class="if-block-container"
                class:selected={action === selectedAction}
              >
                <div
                  class="if-block-header"
                  on:click={() => selectAction(action)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === "Enter" && selectAction(action)}
                >
                  <Icon
                    name="dots-six-vertical"
                    size="L"
                    color="var(--spectrum-global-color-gray-600)"
                    hoverable="true"
                    hovercolor="var(--spectrum-global-color-gray-800)"
                  />
                  <div class="action-header">
                    {index + 1}. IF / ELSE
                  </div>
                  <div class="branch-count">
                    {getBranchActionCount(action)} action{getBranchActionCount(action) !== 1 ? "s" : ""}
                  </div>
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="delete-btn" on:click|stopPropagation={() => deleteAction(index)}>
                    <Icon name="x" hoverable size="S" />
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div
              class="action-container"
              class:selected={action === selectedAction}
              data-dnd-item={action.id}
              on:click={() => selectAction(action)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === "Enter" && selectAction(action)}
            >
              <Icon
                name="dots-six-vertical"
                size="L"
                color="var(--spectrum-global-color-gray-600)"
                hoverable="true"
                hovercolor="var(--spectrum-global-color-gray-800)"
              />
              <div class="action-header">
                {index + 1}.&nbsp;{toDisplay(action[EVENT_TYPE_KEY])}
              </div>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div class="delete-btn" on:click={() => deleteAction(index)}>
                <Icon name="x" hoverable size="S" />
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </Layout>
  <Layout noPadding>
    {#if selectedActionComponent && !showAvailableActions}
      {#key (selectedAction.id)}
        <div class="selected-action-container">
          <svelte:component
            this={selectedActionComponent}
            bind:parameters={selectedAction.parameters}
            bindings={allBindings}
            {nested}
            {componentInstance}
          />
        </div>
      {/key}
      {#if activeIfAction}
        <div class="if-branches">
          <div class="branch-section">
            <div class="branch-label">
              <span>THEN</span>
              <span class="branch-count">{(activeIfAction.parameters?.actions || []).length} action{((activeIfAction.parameters?.actions || []).length) !== 1 ? "s" : ""}</span>
            </div>
            <div
              class="branch-actions"
              use:dndzone={{
                items: activeIfAction?.parameters?.actions || [],
                type: zoneType,
                flipDurationMs,
                dropTargetStyle: { outline: "none" },
                dropFromOthersDisabled: draggingIFBlock,
              }}
              on:consider={(e) => handleBranchConsider(e, activeIfAction.id, "actions")}
              on:finalize={(e) => handleBranchFinalize(e, activeIfAction.id, "actions")}
            >
              {#each activeIfAction.parameters?.actions || [] as childAction, childIndex (childAction.id)}
                <div
                  class="action-container"
                  class:selected={childAction === selectedAction}
                  on:click|stopPropagation={() => openBranchActionDrawer(childAction, "actions")}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === "Enter" && openBranchActionDrawer(childAction, "actions")}
                >
                  <Icon
                    name="dots-six-vertical"
                    size="L"
                    color="var(--spectrum-global-color-gray-600)"
                    hoverable="true"
                    hovercolor="var(--spectrum-global-color-gray-800)"
                  />
                  <div class="action-header">{childIndex + 1}. {toDisplay(childAction[EVENT_TYPE_KEY])}</div>
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="delete-btn" on:click|stopPropagation={() => deleteBranchAction(activeIfAction, "actions", childAction.id)}>
                    <Icon name="x" hoverable size="S" />
                  </div>
                </div>
              {/each}
              {#if !(activeIfAction.parameters?.actions || []).length}
                <div class="branch-placeholder">Drop actions here</div>
              {/if}
            </div>
            <div class="add-action-wrap">
              <Button secondary on:click={(e) => { e.stopPropagation(); openBranchAddDrawer("actions") }}>Add Action</Button>
            </div>
          </div>

          <div class="branch-section">
            <div class="branch-label">
              <span>ELSE</span>
              <span class="branch-count">{(activeIfAction.parameters?.elseActions || []).length} action{((activeIfAction.parameters?.elseActions || []).length) !== 1 ? "s" : ""}</span>
            </div>
            <div
              class="branch-actions"
              use:dndzone={{
                items: activeIfAction?.parameters?.elseActions || [],
                type: zoneType,
                flipDurationMs,
                dropTargetStyle: { outline: "none" },
                dropFromOthersDisabled: draggingIFBlock,
              }}
              on:consider={(e) => handleBranchConsider(e, activeIfAction.id, "elseActions")}
              on:finalize={(e) => handleBranchFinalize(e, activeIfAction.id, "elseActions")}
            >
              {#each activeIfAction.parameters?.elseActions || [] as childAction, childIndex (childAction.id)}
                <div
                  class="action-container"
                  class:selected={childAction === selectedAction}
                  on:click|stopPropagation={() => openBranchActionDrawer(childAction, "elseActions")}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === "Enter" && openBranchActionDrawer(childAction, "elseActions")}
                >
                  <Icon
                    name="dots-six-vertical"
                    size="L"
                    color="var(--spectrum-global-color-gray-600)"
                    hoverable="true"
                    hovercolor="var(--spectrum-global-color-gray-800)"
                  />
                  <div class="action-header">{childIndex + 1}. {toDisplay(childAction[EVENT_TYPE_KEY])}</div>
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="delete-btn" on:click|stopPropagation={() => deleteBranchAction(activeIfAction, "elseActions", childAction.id)}>
                    <Icon name="x" hoverable size="S" />
                  </div>
                </div>
              {/each}
              {#if !(activeIfAction.parameters?.elseActions || []).length}
                <div class="branch-placeholder">Drop actions here</div>
              {/if}
            </div>
            <div class="add-action-wrap">
              <Button secondary on:click={(e) => { e.stopPropagation(); openBranchAddDrawer("elseActions") }}>Add Action</Button>
            </div>
          </div>
        </div>

        <Drawer
          bind:this={branchDrawer}
          title={branchDrawerTitle}
          cancelText={branchDrawerMode === "editor" && branchDrawerIsNew ? "Back" : "Cancel"}
          onCancel={() => {
            if (branchDrawerMode === "editor" && branchDrawerIsNew) {
              branchDrawerMode = "picker"
              branchDrawerAction = null
              branchDrawerDraft = null
              branchDrawerIsNew = false
              branchAddQuery = ""
            } else {
              branchDrawer.hide()
            }
          }}
          on:drawerHide
        >
          <Button slot="buttons" on:click={saveBranchAction}>Save</Button>
          <div class="branch-drawer-body" slot="body">
            {#if branchDrawerMode === "picker"}
              <div class="actions-list">
                <div class="search-wrap">
                  <Search placeholder="Search" bind:value={branchAddQuery} />
                </div>
                {#each Object.entries(branchMappedActionTypes) as [categoryId, category], idx}
                  <div class="heading" class:top-entry={idx === 0}>{categoryId}</div>
                  <ul>
                    {#each category as actionType}
                      <li on:click={() => onBranchPickerSelect(actionType)}>
                        <span class="action-name">{actionType.displayName || actionType.name}</span>
                      </li>
                    {/each}
                  </ul>
                {/each}
              </div>
            {:else if branchDrawerMode === "editor" && branchDrawerComponent && branchDrawerAction}
              {#key (branchDrawerAction.id)}
                <div class="selected-action-container">
                  <svelte:component
                    this={branchDrawerComponent}
                    bind:parameters={branchDrawerDraft}
                    bindings={allBindings}
                    {nested}
                    {componentInstance}
                  />
                </div>
              {/key}
            {/if}
          </div>
        </Drawer>
      {/if}
    {/if}
  </Layout>
</DrawerContent>

<style>
  .actions {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    gap: var(--spacing-s);
    min-height: 4px;
  }
  .action-header {
    color: var(--spectrum-global-color-gray-700);
    flex: 1 1 auto;
  }
  .action-container {
    background-color: var(--background);
    padding: var(--spacing-s) var(--spacing-m);
    border-radius: 4px;
    border: 1px solid var(--spectrum-global-color-gray-300);
    transition: background-color 130ms ease-in-out, color 130ms ease-in-out, border-color 130ms ease-in-out;
    gap: var(--spacing-m);
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
  }
  .action-container:active {
    cursor: grabbing;
  }
  .action-container:hover,
  .action-container.selected {
    background-color: var(--spectrum-global-color-gray-50);
    border-color: var(--spectrum-global-color-gray-500);
  }
  .action-container:hover .action-header,
  .action-container.selected .action-header {
    color: var(--spectrum-global-color-gray-900);
  }

  .if-block-wrapper {
    display: flex;
    flex-direction: column;
  }
  .if-block-container {
    background-color: var(--spectrum-global-color-gray-75);
    border-radius: 4px;
    border: 1px solid var(--spectrum-global-color-gray-300);
    transition: background-color 130ms ease-in-out, border-color 130ms ease-in-out;
    overflow: hidden;
  }
  .if-block-container:hover,
  .if-block-container.selected {
    border-color: var(--spectrum-global-color-gray-500);
  }
  .if-block-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-m);
    padding: var(--spacing-s) var(--spacing-m);
    background-color: var(--background);
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    cursor: grab;
  }
  .if-block-header:active {
    cursor: grabbing;
  }
  .if-block-container:hover .if-block-header .action-header,
  .if-block-container.selected .if-block-header .action-header {
    color: var(--spectrum-global-color-gray-900);
  }
  .if-branches {
    padding: var(--spacing-s);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
    max-width: 320px;
  }
  .branch-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-height: 20px;
    border-radius: 4px;
    padding: var(--spacing-xs);
    transition: background-color 130ms ease-in-out;
  }
  .branch-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-height: 8px;
  }
  .branch-label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-s);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--spacing-xs) var(--spacing-s);
    user-select: none;
  }
  .add-action-wrap {
    padding: var(--spacing-xs) var(--spacing-s);
  }
  .branch-placeholder {
    border: 2px dashed var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    padding: var(--spacing-l);
    text-align: center;
    color: var(--spectrum-global-color-gray-400);
    font-size: var(--font-size-s);
    margin: 0 var(--spacing-xs);
  }
  .branch-count {
    font-size: var(--font-size-xs);
    color: var(--spectrum-global-color-gray-500);
    white-space: nowrap;
  }
  .branch-drawer-body {
    padding: var(--spacing-m);
    overflow-y: auto;
  }
  .delete-btn {
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 130ms ease-in-out;
  }
  .action-container:hover .delete-btn,
  .if-block-header:hover .delete-btn {
    opacity: 1;
  }

  .actions-list > * { padding-bottom: var(--spectrum-global-dimension-static-size-200); }
  .actions-list .heading { padding-bottom: var(--spectrum-global-dimension-static-size-100); padding-top: var(--spectrum-global-dimension-static-size-50); }
  .actions-list .heading.top-entry { padding-top: 0px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li {
    font-size: var(--font-size-s);
    padding: var(--spacing-m);
    border-radius: 4px;
    background-color: var(--spectrum-global-color-gray-200);
    transition: background-color 130ms ease-in-out, color 130ms ease-in-out, border-color 130ms ease-in-out;
    word-wrap: break-word;
  }
  li:not(:last-of-type) { margin-bottom: var(--spacing-s); }
  li :global(*) { transition: color 130ms ease-in-out; }
  li:hover { color: var(--spectrum-global-color-gray-900); background-color: var(--spectrum-global-color-gray-50); cursor: pointer; }
  .action-name { font-weight: 600; text-transform: capitalize; }
  .heading { font-size: var(--font-size-s); font-weight: 600; text-transform: uppercase; color: var(--spectrum-global-color-gray-600); }
</style>
