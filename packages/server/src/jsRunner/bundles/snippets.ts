import { iifeWrapper } from "@supertoolmake/string-templates"

export default new Proxy(
  {},
  {
    get: (_, name) => {
      // Both snippetDefinitions and snippetCache are injected to the isolate
      // global scope before this bundle is loaded, so we can access it from
      // there.
      // See https://esbuild.github.io/content-types/#direct-eval for info on
      // why eval is being called this way.
      // Snippets are cached and reused once they have been evaluated.
      // @ts-expect-error snippetDefinitions and snippetCache are injected to the global scope
      if (!(name in snippetCache)) {
        // @ts-expect-error snippetDefinitions and snippetCache are injected to the global scope
        snippetCache[name] = [eval][0](iifeWrapper(snippetDefinitions[name]))
      }
      // @ts-expect-error snippetDefinitions and snippetCache are injected to the global scope
      return snippetCache[name]
    },
  }
)
