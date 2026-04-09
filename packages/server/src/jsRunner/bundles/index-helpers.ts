import { getJsHelperList } from "@supertoolmake/string-templates/src/helpers/list"

export default {
  ...getJsHelperList(),
  // pointing stripProtocol to a unexisting function to be able to declare it on isolated-vm
  // @ts-expect-error
  stripProtocol: helpersStripProtocol,
}
