import { resolveReaderSearchBindings } from "./utils"

describe("reader search bindings", () => {
  const user = {
    _id: "user_123",
    globalId: "user_123",
    email: "reader@example.com",
    oauth2: { accessToken: "secret", refreshToken: "refresh-secret" },
  }

  it.each([
    "{{ user.globalId }}",
    "{{ [user].globalId }}",
    "{{ [user].[globalId] }}",
    "{{ user.[globalId] }}",
  ])("resolves the reader's identity with %s", (binding) => {
    expect(resolveReaderSearchBindings({ query: { equal: { name: binding } }, user })).toEqual({
      equal: { name: "user_123" },
    })
  })

  it.each([
    "{{ js 'cmV0dXJuIDE=' }}",
    "{{#js}}return 1{{/js}}",
    "{{ user.oauth2.accessToken }}",
    "{{ [user].[oauth2].[accessToken] }}",
    "{{ env.SECRET }}",
    "{{ snippet.secret }}",
  ])("rejects privileged bindings in nested arrays: %s", (binding) => {
    expect(() =>
      resolveReaderSearchBindings({
        query: { $and: { conditions: [{ oneOf: { name: [binding] } }] } },
        user,
      })
    ).toThrow("Unsupported search query binding")
  })

  it("preserves literal filters, nulls, booleans and numbers", () => {
    const query = { equal: { name: "literal", count: 0, enabled: false, missing: null } }
    expect(resolveReaderSearchBindings({ query, user })).toEqual(query)
  })

  it("supports anonymous filters and missing identity fields", () => {
    expect(
      resolveReaderSearchBindings({ query: { equal: { name: "{{ user.email }}" } }, user: {} })
    ).toEqual({ equal: { name: "" } })
    expect(resolveReaderSearchBindings({ query: undefined, user: {} })).toEqual({})
  })
})
