import { iifeWrapper, UserScriptError } from "@supertoolmake/string-templates"
import type { Ctx } from "@supertoolmake/types"
import { IsolatedVM } from "../../jsRunner/vm"

export async function execute(ctx: Ctx) {
  const { script, context } = ctx.request.body
  const vm = new IsolatedVM()
  try {
    ctx.body = vm.withContext(context, () => vm.execute(iifeWrapper(script)))
  } catch (err: any) {
    if (err.code === UserScriptError.code) {
      throw err.userScriptError
    }
    throw err
  }
}
