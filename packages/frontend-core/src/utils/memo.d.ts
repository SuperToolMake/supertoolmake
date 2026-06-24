import { Readable, Writable } from "svelte/store"

declare module "./memo" {
  export function memo<T>(value?: T): Writable<T>

  export function derivedMemo<TStore, TResult>(
    store: Readable<TStore>,
    derivation: (store: TStore) => TResult
  ): Readable<TResult>

  export function derivedMemo<TResult>(
    stores: Readable<any>[],
    derivation: (stores: any[]) => TResult
  ): Readable<TResult>
}
