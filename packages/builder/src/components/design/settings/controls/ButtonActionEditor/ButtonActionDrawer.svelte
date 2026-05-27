<script>
import { ActionButton, Button, DrawerContent, Icon, Layout, Search } from "@supertoolmake/bbui"
import { cloneDeep } from "lodash/fp"
import { generate } from "shortid"
import { getActionBindings, getEventContextBindings, makeStateBinding, updateReferencesInObject } from "@/dataBinding"
import { getAvailableActions } from "./index"

const EVENT_TYPE_KEY = "##eventHandlerType"
const IF_TYPE = "IF"
const actionTypes = getAvailableActions()

export let key
export let actions
export let bindings = []
export let nested
export let componentInstance

let actionQuery
let selectedAction = actions?.length ? actions[0] : null
let branchAddPicker = null // { ifActionId: string, branchKey: string }
let branchAddQuery = ""

const isIFBlock = (action) => {
  return action?.[EVENT_TYPE_KEY] === IF_TYPE
}

const setUpdateActions = (actions) => {
  return actions
    ? cloneDeep(actions)
        .filter((a) => a[EVENT_TYPE_KEY] === "Update State" && a.parameters?.type === "set" && a.parameters.key)
        .reduce((acc, a) => { acc[a.id] = a; return acc }, {})
    : []
}

let updateStateActions = setUpdateActions(actions)

let dragInfo = null
let dropIndicator = null

function matchesDrop(zoneType, parentActionId, branchKey, index) {
  if (!dropIndicator) return false
  if (dropIndicator.zoneType !== zoneType) return false
  if (zoneType === "branch") {
    if (dropIndicator.parentActionId !== parentActionId || dropIndicator.branchKey !== branchKey) return false
  }
  return dropIndicator.index === index
}

function startDrag(e, action, source) {
  dragInfo = { action, source }
  e.dataTransfer.effectAllowed = "move"
  e.dataTransfer.setData("text/plain", action.id)
}

function clearDrag() {
  dragInfo = null
  dropIndicator = null
}

function updateDropIndicator(zoneType, containerEl, clientY, parentActionId, branchKey) {
  const index = getInsertIndex(containerEl, clientY)
  dropIndicator = { zoneType, index, parentActionId, branchKey }
}

function getInsertIndex(containerEl, clientY) {
  const children = Array.from(containerEl.querySelectorAll("[data-dnd-item]"))
  for (let i = 0; i < children.length; i++) {
    const rect = children[i].getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    if (clientY < mid) return i
  }
  return children.length
}

function handleTopLevelDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
  updateDropIndicator("top-level", e.currentTarget, e.clientY)
}

function handleTopLevelDragLeave() {
  if (dropIndicator?.zoneType === "top-level") dropIndicator = null
}

function handleTopLevelDrop(e) {
  e.preventDefault()
  if (!dragInfo) return
  const targetEl = e.currentTarget
  const insertAt = getInsertIndex(targetEl, e.clientY)

  const src = dragInfo.source

  if (src.type === "branch") {
    const parentAction = actions.find((a) => a.id === src.parentActionId)
    if (parentAction?.parameters) {
      const branchArr = parentAction.parameters[src.branchKey] || []
      const idx = branchArr.findIndex((a) => a.id === dragInfo.action.id)
      if (idx !== -1) branchArr.splice(idx, 1)
      parentAction.parameters[src.branchKey] = [...branchArr]
    }
    actions = [...actions.slice(0, insertAt), dragInfo.action, ...actions.slice(insertAt)]
  } else if (src.type === "top-level") {
    const oldIdx = actions.findIndex((a) => a.id === dragInfo.action.id)
    if (oldIdx !== -1) {
      actions.splice(oldIdx, 1)
      const newIdx = oldIdx < insertAt ? insertAt - 1 : insertAt
      actions.splice(newIdx, 0, dragInfo.action)
      actions = [...actions]
    }
  }
  clearDrag()
}

function handleBranchDragOver(e, parentActionId, branchKey) {
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
  updateDropIndicator("branch", e.currentTarget, e.clientY, parentActionId, branchKey)
}

function handleBranchDragLeave() {
  if (dropIndicator?.zoneType === "branch") dropIndicator = null
}

function handleBranchDrop(e, parentActionId, branchKey) {
  e.preventDefault()
  if (!dragInfo) return
  const targetEl = e.currentTarget
  const insertAt = getInsertIndex(targetEl, e.clientY)

  const parentAction = actions.find((a) => a.id === parentActionId)
  if (!parentAction?.parameters) {
    clearDrag()
    return
  }

  const src = dragInfo.source
  const targetArr = parentAction.parameters[branchKey] || []

  if (src.type === "branch") {
    if (src.parentActionId === parentActionId && src.branchKey === branchKey) {
      const oldIdx = targetArr.findIndex((a) => a.id === dragInfo.action.id)
      if (oldIdx !== -1) {
        targetArr.splice(oldIdx, 1)
        const newIdx = oldIdx < insertAt ? insertAt - 1 : insertAt
        targetArr.splice(newIdx, 0, dragInfo.action)
        parentAction.parameters[branchKey] = [...targetArr]
        actions = [...actions]
        clearDrag()
        return
      }
    }
    const srcParent = actions.find((a) => a.id === src.parentActionId)
    if (srcParent?.parameters) {
      const srcArr = srcParent.parameters[src.branchKey] || []
      const idx = srcArr.findIndex((a) => a.id === dragInfo.action.id)
      if (idx !== -1) srcArr.splice(idx, 1)
      srcParent.parameters[src.branchKey] = [...srcArr]
    }
    targetArr.splice(insertAt, 0, dragInfo.action)
    parentAction.parameters[branchKey] = [...targetArr]
    actions = [...actions]
  } else if (src.type === "top-level") {
    const oldIdx = actions.findIndex((a) => a.id === dragInfo.action.id)
    if (oldIdx !== -1) {
      actions.splice(oldIdx, 1)
      actions = [...actions]
    }
    targetArr.splice(insertAt, 0, dragInfo.action)
    parentAction.parameters[branchKey] = [...targetArr]
    actions = [...actions]
  }
  clearDrag()
}

const deleteAction = (index) => {
  const selectedIndex = actions.indexOf(selectedAction)
  const isSelected = index === selectedIndex
  actions.splice(index, 1)
  actions = [...actions]
  if (isSelected) selectedAction = actions?.length ? actions[0] : null
  updateReferencesInObject({ obj: actions, modifiedIndex: index, action: "delete", label: "actions" })
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
  branchAddPicker = null
  branchAddQuery = ""
  selectedAction = newAction
}

const selectAction = (action) => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  selectedAction = action
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
    .filter((a) => a[EVENT_TYPE_KEY] === "Update State" && a.parameters?.type === "set" && a.parameters.key)
    .forEach((action) => {
      const stateBinding = makeStateBinding(action.parameters.key)
      const hasKey = actionBindings.some((b) => b.runtimeBinding === stateBinding.runtimeBinding)
      if (!hasKey) {
        let existing = updateStateActions[action.id]
        if (existing) {
          const existingBinding = makeStateBinding(existing.parameters.key)
          cloneActionBindings = cloneActionBindings.filter((b) => b.runtimeBinding !== existingBinding.runtimeBinding)
        }
        allBindings.push(stateBinding)
      }
    })

  const asyncAutoIndexes = flattenedActions
    .map((a, i) => a[EVENT_TYPE_KEY] === "Trigger Automation" && !a.parameters?.synchronous ? i : undefined)
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

$: eventContextBindings = getEventContextBindings({ componentInstance, settingKey: key })
$: actionContextBindings = getActionBindings(actions, selectedAction?.id)

$: allBindings = getAllBindings(bindings, [...eventContextBindings, ...actionContextBindings], actions)

$: {
  if (actions) {
    actions.forEach((action) => {
      if (!action.id) action.id = generate()
    })
  }
}
$: selectedActionComponent = selectedAction && actionTypes.find((t) => t.name === selectedAction[EVENT_TYPE_KEY])?.component

$: {
  if (selectedAction && actions && !actions.includes(selectedAction)) {
    const found = findBranchActionById(actions, selectedAction.id)
    if (!found) selectedAction = actions?.[0]
  }
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
              <li on:click={onAddAction(actionType)}>
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

      <div class="actions" on:dragover|preventDefault={handleTopLevelDragOver} on:drop={handleTopLevelDrop} on:dragleave={handleTopLevelDragLeave}>
        {#each actions as action, index (action.id)}
          {#if matchesDrop("top-level", null, null, index)}
            <div class="drop-indicator"></div>
          {/if}
          {#if isIFBlock(action)}
            <div class="if-block-wrapper" data-dnd-item={action.id}>
              <div
                class="if-block-container"
                class:selected={action === selectedAction}
              >
                <div
                  class="if-block-header"
                  draggable="true"
                  on:dragstart={(e) => startDrag(e, action, { type: "top-level" })}
                  on:dragend={clearDrag}
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

                <div class="if-branches">
                  <div class="branch-section" on:dragover|preventDefault={(e) => handleBranchDragOver(e, action.id, "actions")} on:drop={(e) => handleBranchDrop(e, action.id, "actions")} on:dragleave={handleBranchDragLeave}>
                    <div class="branch-label">
                      <span>IF TRUE</span>
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <span
                        class="branch-add-btn"
                        on:click|stopPropagation={() => { branchAddPicker = { ifActionId: action.id, branchKey: "actions" }; branchAddQuery = "" }}
                      >+</span>
                    </div>
                    {#if branchAddPicker?.ifActionId === action.id && branchAddPicker?.branchKey === "actions"}
                      <div class="branch-add-picker" on:dragstart|preventDefault on:dragover|preventDefault on:drop|preventDefault>
                        <input class="branch-add-search" type="text" placeholder="Search..." bind:value={branchAddQuery} />
                        <div class="branch-add-items">
                          {#each actionTypes.filter((t) => t.name !== "IF").filter((t) => !branchAddQuery || t.name.toLowerCase().trim().includes(branchAddQuery.toLowerCase().trim())) as actionType}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div class="branch-add-item" on:click={() => addBranchAction(action, "actions", actionType)}>
                              {actionType.displayName || actionType.name}
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    {#each action.parameters?.actions || [] as childAction, childIndex (childAction.id)}
                      {#if matchesDrop("branch", action.id, "actions", childIndex)}
                        <div class="drop-indicator"></div>
                      {/if}
                      <div
                        class="action-container branch-action"
                        class:selected={childAction === selectedAction}
                        data-dnd-item={childAction.id}
                        draggable="true"
                        on:dragstart={(e) => startDrag(e, childAction, { type: "branch", parentActionId: action.id, branchKey: "actions" })}
                        on:dragend={clearDrag}
                        on:click|stopPropagation={() => selectAction(childAction)}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) => e.key === "Enter" && selectAction(childAction)}
                      >
                        <Icon
                          name="dots-six-vertical"
                          size="L"
                          color="var(--spectrum-global-color-gray-600)"
                          hoverable="true"
                          hovercolor="var(--spectrum-global-color-gray-800)"
                        />
                        <div class="action-header">{toDisplay(childAction[EVENT_TYPE_KEY])}</div>
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="delete-btn" on:click|stopPropagation={() => deleteBranchAction(action, "actions", childAction.id)}>
                          <Icon name="x" hoverable size="S" />
                        </div>
                      </div>
                    {/each}
                    {#if matchesDrop("branch", action.id, "actions", (action.parameters?.actions || []).length)}
                      <div class="drop-indicator"></div>
                    {/if}
                  </div>

                  <div class="branch-section" on:dragover|preventDefault={(e) => handleBranchDragOver(e, action.id, "elseActions")} on:drop={(e) => handleBranchDrop(e, action.id, "elseActions")} on:dragleave={handleBranchDragLeave}>
                    <div class="branch-label">
                      <span>ELSE</span>
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <span
                        class="branch-add-btn"
                        on:click|stopPropagation={() => { branchAddPicker = { ifActionId: action.id, branchKey: "elseActions" }; branchAddQuery = "" }}
                      >+</span>
                    </div>
                    {#if branchAddPicker?.ifActionId === action.id && branchAddPicker?.branchKey === "elseActions"}
                      <div class="branch-add-picker" on:dragstart|preventDefault on:dragover|preventDefault on:drop|preventDefault>
                        <input class="branch-add-search" type="text" placeholder="Search..." bind:value={branchAddQuery} />
                        <div class="branch-add-items">
                          {#each actionTypes.filter((t) => t.name !== "IF").filter((t) => !branchAddQuery || t.name.toLowerCase().trim().includes(branchAddQuery.toLowerCase().trim())) as actionType}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div class="branch-add-item" on:click={() => addBranchAction(action, "elseActions", actionType)}>
                              {actionType.displayName || actionType.name}
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    {#each action.parameters?.elseActions || [] as childAction, childIndex (childAction.id)}
                      {#if matchesDrop("branch", action.id, "elseActions", childIndex)}
                        <div class="drop-indicator"></div>
                      {/if}
                      <div
                        class="action-container branch-action"
                        class:selected={childAction === selectedAction}
                        data-dnd-item={childAction.id}
                        draggable="true"
                        on:dragstart={(e) => startDrag(e, childAction, { type: "branch", parentActionId: action.id, branchKey: "elseActions" })}
                        on:dragend={clearDrag}
                        on:click|stopPropagation={() => selectAction(childAction)}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) => e.key === "Enter" && selectAction(childAction)}
                      >
                        <Icon
                          name="dots-six-vertical"
                          size="L"
                          color="var(--spectrum-global-color-gray-600)"
                          hoverable="true"
                          hovercolor="var(--spectrum-global-color-gray-800)"
                        />
                        <div class="action-header">{toDisplay(childAction[EVENT_TYPE_KEY])}</div>
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="delete-btn" on:click|stopPropagation={() => deleteBranchAction(action, "elseActions", childAction.id)}>
                          <Icon name="x" hoverable size="S" />
                        </div>
                      </div>
                    {/each}
                    {#if matchesDrop("branch", action.id, "elseActions", (action.parameters?.elseActions || []).length)}
                      <div class="drop-indicator"></div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div
              class="action-container"
              class:selected={action === selectedAction}
              data-dnd-item={action.id}
              draggable="true"
              on:dragstart={(e) => startDrag(e, action, { type: "top-level" })}
              on:dragend={clearDrag}
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
        {#if matchesDrop("top-level", null, null, (actions || []).length)}
          <div class="drop-indicator"></div>
        {/if}
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
    gap: var(--spacing-s);
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
  .branch-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--spectrum-global-color-gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--spacing-xs) var(--spacing-s);
    user-select: none;
  }
  .branch-action {
    margin-left: var(--spacing-l);
    padding: var(--spacing-xs) var(--spacing-m);
  }
  .branch-action:hover {
    cursor: grab;
  }
  .branch-action:active {
    cursor: grabbing;
  }
  .branch-add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: var(--spectrum-global-color-gray-300);
    color: var(--spectrum-global-color-gray-700);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    margin-left: var(--spacing-s);
    user-select: none;
    transition: background-color 130ms ease-in-out;
  }
  .branch-add-btn:hover {
    background-color: var(--spectrum-global-color-gray-400);
  }
  .branch-add-picker {
    margin-left: var(--spacing-l);
    background-color: var(--background);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    overflow: hidden;
    z-index: 10;
  }
  .branch-add-search {
    width: 100%;
    box-sizing: border-box;
    padding: var(--spacing-xs) var(--spacing-s);
    border: none;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    font-size: var(--font-size-s);
    outline: none;
  }
  .branch-add-search:focus {
    background-color: var(--spectrum-global-color-gray-50);
  }
  .branch-add-items {
    max-height: 180px;
    overflow-y: auto;
  }
  .branch-add-item {
    padding: var(--spacing-xs) var(--spacing-s);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: background-color 130ms ease-in-out;
  }
  .branch-add-item:hover {
    background-color: var(--spectrum-global-color-gray-50);
  }
  .branch-count {
    font-size: var(--font-size-xs);
    color: var(--spectrum-global-color-gray-500);
    white-space: nowrap;
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

  .drop-indicator {
    height: 3px;
    background-color: var(--spectrum-global-color-blue-500);
    border-radius: 2px;
    margin: -1px 0;
    flex-shrink: 0;
    pointer-events: none;
    transition: opacity 100ms ease;
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
