<script lang="ts">
  import { MarkdownViewer } from "@budibase/bbui"
  // @ts-expect-error
  import LICENSE from "../../../../../LICENSE?raw"

  export let baseUrl: string | undefined = undefined

  let contentEl: HTMLDivElement | null = null

  const resolveBaseUrl = (value: string | undefined) => {
    const url = (value || "").trim()
    if (!url) {
      return undefined
    }
    try {
      return new URL(url).toString()
    } catch (_error) {
      return undefined
    }
  }

  const toAbsoluteUrl = (
    href: string | null | undefined,
    resolvedBase?: string
  ) => {
    if (!href) {
      return undefined
    }
    try {
      if (resolvedBase) {
        return new URL(href, resolvedBase).toString()
      }
      return new URL(href).toString()
    } catch (_error) {
      if (resolvedBase) {
        try {
          return new URL(href, resolvedBase).toString()
        } catch (_err) {
          return undefined
        }
      }
      return undefined
    }
  }

  interface LinkEnhancerParams {
    baseUrl?: string
    contentKey?: string
    onMutate?: () => void
  }

  const replaceWithSpan = (anchor: HTMLAnchorElement) => {
    const span = anchor.ownerDocument?.createElement("span")
    if (!span) {
      return
    }
    while (anchor.firstChild) {
      span.appendChild(anchor.firstChild)
    }
    anchor.replaceWith(span)
  }

  const isHashLink = (href?: string | null) =>
    typeof href === "string" && href.trim().startsWith("#")

  const enhanceLinks = (node: HTMLElement, params: LinkEnhancerParams = {}) => {
    let { baseUrl: currentBase, onMutate } = params

    const apply = () => {
      const resolvedBase = resolveBaseUrl(currentBase)
      node.querySelectorAll("a").forEach(anchor => {
        const href = anchor.getAttribute("href") || undefined
        if (isHashLink(href)) {
          replaceWithSpan(anchor)
          return
        }
        if (resolvedBase) {
          const absolute = toAbsoluteUrl(href, resolvedBase)
          if (absolute) {
            anchor.setAttribute("href", absolute)
          }
        }
        anchor.setAttribute("target", "_blank")
        anchor.setAttribute("rel", "noopener noreferrer")
        anchor.classList.add("spectrum-Link", "spectrum-Link--sizeM")
      })
      onMutate?.()
    }

    const observer = new MutationObserver(apply)
    observer.observe(node, { childList: true, subtree: true })
    apply()

    return {
      update(newParams?: LinkEnhancerParams) {
        currentBase = newParams?.baseUrl
        onMutate = newParams?.onMutate
        apply()
      },
      destroy() {
        observer.disconnect()
      },
    }
  }
</script>

<div>
  <div class="description-viewer">
    <div
      class="description-content"
      bind:this={contentEl}
      use:enhanceLinks={{
        baseUrl,
        contentKey: LICENSE,
      }}
    >
      <MarkdownViewer value={LICENSE} />
    </div>
  </div>
</div>

<style>
  .description-viewer {
    margin: auto;
    position: relative;
    padding: 12px;
    border: 1px solid var(--grey-3);
    border-radius: 4px;
    color: var(--grey-8);
    background-color: var(--background);
    font-family: monospace;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 580px;
  }

  .description-content {
    overflow: auto;
    position: relative;
  }

  /* Links */
  .description-viewer :global(a) {
    color: var(--primaryColor, var(--spectrum-global-color-blue-600));
    text-decoration: none;
  }
  .description-viewer :global(a:hover) {
    color: var(--primaryColorHover, var(--spectrum-global-color-blue-500));
  }
</style>
