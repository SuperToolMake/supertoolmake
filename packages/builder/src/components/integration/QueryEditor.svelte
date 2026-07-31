<script>
import { Label } from "@supertoolmake/bbui"
import { Theme } from "@supertoolmake/types"
import { createEventDispatcher, onMount } from "svelte"
import { themeStore } from "@/stores/portal"
import CodeMirror from "./codemirror"

const dispatch = createEventDispatcher()

const THEMES = {
  DARK: "tomorrow-night-eighties",
  LIGHT: "default",
}

export let label = undefined
export let value = ""
export let readOnly = false
export let lineNumbers = true
export let tab = true
export let mode
export let editorHeight = 500
export let editorWidth = 640
export let autoHeight = false

let width
let height
$: sqlMode = mode === "sql" || mode?.startsWith("text/x-")

// We have to expose set and update methods, rather
// than making this state-driven through props,
// because it's difficult to update an editor
// without resetting scroll otherwise
export async function set(new_value, new_mode) {
  if (new_mode !== mode) {
    mode = new_mode
    await createEditor(mode)
  }

  value = new_value
  updating_externally = true
  if (editor) {
    editor.setValue(value)
    adjustEditorHeight()
  }
  updating_externally = false
}

export function update(new_value) {
  value = new_value

  if (editor) {
    const { left, top } = editor.getScrollInfo()
    editor.setValue(value)
    editor.scrollTo(left, top)
    adjustEditorHeight()
  }
}

export function resize() {
  editor.refresh()
}

export function focus() {
  editor.focus()
}

export function insertAtCursor(text) {
  if (editor) {
    editor.replaceSelection(text)
    editor.focus()
  }
}

const modes = {
  js: {
    name: "javascript",
    json: false,
  },
  json: {
    name: "javascript",
    json: true,
  },
  sql: {
    name: "sql",
  },
  svelte: {
    name: "handlebars",
    base: "text/html",
  },
}

const bindingOverlay = {
  token(stream) {
    if (stream.match(/\{\{[^}]*\}\}/)) {
      return "binding"
    }

    while (!stream.match(/\{\{/, false) && stream.next() != null) {}
    return null
  },
}

const refs = {}
let editor
let updating_externally = false
let destroyed = false

function adjustEditorHeight() {
  if (!autoHeight || !editor) return

  const lineHeight = editor.defaultTextHeight()
  const lineCount = Math.max(editor.lineCount(), 3)
  editor.setSize(null, `${lineCount * lineHeight + 8}px`)
}

async function createEditor(mode) {
  if (destroyed || !CodeMirror) return

  if (editor) editor.toTextArea()

  const opts = {
    lineNumbers,
    lineWrapping: true,
    indentWithTabs: true,
    indentUnit: 2,
    tabSize: 2,
    value: value || "",
    mode: modes[mode] || {
      name: mode,
    },

    readOnly,
    autoCloseBrackets: true,
    autoCloseTags: true,
    theme: $themeStore.theme === Theme.LIGHT ? THEMES.LIGHT : THEMES.DARK,
  }

  if (!tab)
    opts.extraKeys = {
      Tab: tab,
      "Shift-Tab": tab,
    }

  if (destroyed) return

  CodeMirror.commands.autocomplete = (cm) => {
    CodeMirror.showHint(cm, CodeMirror.hint.javascript)
  }

  editor = CodeMirror.fromTextArea(refs.editor, opts)
  if (sqlMode) editor.addOverlay(bindingOverlay)

  editor.on("change", (instance) => {
    adjustEditorHeight()
    if (!updating_externally) {
      const value = instance.getValue()
      dispatch("change", { value })
    }
  })

  // editor.on("cursorActivity", function() {
  //   editor.showHint({
  //     hint: function() {
  //       return {
  //         from: editor.getDoc().getCursor(),
  //         to: editor.getDoc().getCursor(),
  //         list: completions,
  //       }
  //     },
  //   })
  // })

  editor.refresh()
}

$: if (editor && width && height) {
  editor.refresh()
}

onMount(() => {
  createEditor(mode).then(() => {
    if (editor) {
      editor.refresh()
      adjustEditorHeight()
    }
  })

  return () => {
    destroyed = true
    if (editor) editor.toTextArea()
  }
})

</script>

{#if label}
  <Label small>{label}</Label>
{/if}
<div
  class:sqlMode
  style={`--code-mirror-height: ${editorHeight}px; --code-mirror-width: ${editorWidth}px; --code-mirror-resize: ${autoHeight ? "none" : "vertical"};`}
>
  <textarea tabindex="0" bind:this={refs.editor} readonly {value}></textarea>
</div>

<style>
  textarea {
    visibility: hidden;
  }

  div {
    margin-top: var(--spacing-s);
  }

  div :global(.CodeMirror) {
    height: var(--code-mirror-height);
    min-height: 200px;
    border-radius: var(--border-radius-s);
    font-family: var(--font-mono);
    line-height: 1.3;
    resize: var(--code-mirror-resize);
  }

  div.sqlMode :global(span.cm-keyword) {
    color: #2BAB72 !important;
    font-weight: 700;
  }

  div.sqlMode :global(span.cm-binding) {
    color: #6E99C4 !important;
    font-weight: 400 !important;
  }
</style>
