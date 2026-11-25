type Frame =
  | { type: "code" }
  | { type: "interpolation"; braces: number }
  | { type: "string"; quote: string }
  | { type: "template" }

/**
 * Determines whether a position sits inside a string literal or the text
 * part of a template literal. Code within a ${} interpolation counts as
 * code, not string content, so bindings are still wrapped there.
 */
export const isInsideStringLiteral = (before: string): boolean => {
  const stack: Frame[] = [{ type: "code" }]
  for (let i = 0; i < before.length; i++) {
    const char = before[i]
    const frame = stack[stack.length - 1]
    if (frame.type === "string") {
      if (char === "\\") {
        i++
      } else if (char === frame.quote) {
        stack.pop()
      }
    } else if (frame.type === "template") {
      if (char === "\\") {
        i++
      } else if (char === "`") {
        stack.pop()
      } else if (char === "$" && before[i + 1] === "{") {
        stack.push({ type: "interpolation", braces: 0 })
        i++
      }
    } else if (char === "'" || char === '"') {
      stack.push({ type: "string", quote: char })
    } else if (char === "`") {
      stack.push({ type: "template" })
    } else if (char === "/" && before[i + 1] === "/") {
      const end = before.indexOf("\n", i)
      if (end === -1) {
        break
      }
      i = end
    } else if (char === "/" && before[i + 1] === "*") {
      const end = before.indexOf("*/", i + 2)
      if (end === -1) {
        break
      }
      i = end + 1
    } else if (frame.type === "interpolation") {
      if (char === "{") {
        frame.braces++
      } else if (char === "}") {
        if (frame.braces === 0) {
          stack.pop()
        } else {
          frame.braces--
        }
      }
    }
  }
  const top = stack[stack.length - 1]
  return top.type === "string" || top.type === "template"
}
