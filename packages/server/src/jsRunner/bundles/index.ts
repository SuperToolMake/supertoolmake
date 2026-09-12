import fs from "node:fs"

export enum BundleType {
  HELPERS = "helpers",
  SNIPPETS = "snippets",
  BUFFER = "buffer",
}

const bundleSourceFile: Record<BundleType, string> = {
  [BundleType.HELPERS]: "./index-helpers.ivm.bundle.js",
  [BundleType.SNIPPETS]: "./snippets.ivm.bundle.js",
  [BundleType.BUFFER]: "./buffer.ivm.bundle.js",
}
const bundleSourceCode: Partial<Record<BundleType, string>> = {}

export function loadBundle(type: BundleType) {
  let sourceCode = bundleSourceCode[type]
  if (sourceCode) {
    return sourceCode
  }

  sourceCode = fs.readFileSync(require.resolve(bundleSourceFile[type]), "utf-8")
  bundleSourceCode[type] = sourceCode
  return sourceCode
}
