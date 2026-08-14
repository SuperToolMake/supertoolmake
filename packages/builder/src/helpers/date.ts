import { processStringSync } from "@supertoolmake/string-templates"

export function durationFromNow(isoDate: string) {
  return processStringSync("{{ durationFromNow time 'millisecond' }}", {
    time: isoDate,
  })
}
