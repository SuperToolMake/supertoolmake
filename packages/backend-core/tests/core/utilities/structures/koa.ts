import type { Ctx } from "@supertoolmake/types"
import { createMockContext, createMockCookies } from "@shopify/jest-koa-mocks"

export const newContext = (): Ctx => {
  const ctx = createMockContext({
    throw: jest.fn().mockImplementation(() => {
      throw new Error()
    }),
  }) as Ctx
  return {
    ...ctx,
    path: "/",
    cookies: createMockCookies(),
    request: {
      ...ctx.request,
      headers: {},
      body: {},
    },
  }
}
