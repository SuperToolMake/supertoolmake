import type { Log, ProcessOptions } from "../types"
import { FIND_HBS_REGEX } from "../utilities"
import type { Postprocessor } from "./postprocessor"
import * as postprocessor from "./postprocessor"
import type { Preprocessor } from "./preprocessor"
import * as preprocessor from "./preprocessor"

function process(
  output: string,
  processors: (Preprocessor | Postprocessor)[],
  opts?: ProcessOptions
) {
  let logs: Log[] = []
  for (const processor of processors) {
    // if a literal statement has occurred stop
    if (typeof output !== "string") {
      break
    }
    // re-run search each time incase previous processor updated/removed a match
    const regexp = new RegExp(FIND_HBS_REGEX)
    const matches = output.match(regexp)
    if (matches == null) {
      continue
    }
    for (const match of matches) {
      const res = processor.process(output, match, opts || {})
      if (typeof res === "object") {
        if ("logs" in res && res.logs) {
          logs = logs.concat(res.logs)
        }
        output = res.result
      } else {
        output = res as string
      }
    }
  }
  return { result: output, logs }
}

export function preprocess(string: string, opts: ProcessOptions) {
  let processors = preprocessor.processors
  if (opts.noFinalise) {
    processors = processors.filter(
      (processor) => processor.name !== preprocessor.PreprocessorNames.FINALISE
    )
  }

  return process(string, processors, opts).result
}

export function postprocess(string: string) {
  return process(string, postprocessor.processors).result
}

export function postprocessWithLogs(string: string) {
  return process(string, postprocessor.processors)
}
