/**
 * A reusable, retryable import boundary.
 * Module identity is runtime-owned; the serializable Model records readiness.
 */
export const lazyModule = <A>(loader: () => Promise<A>) => {
  let value: A | undefined
  let pending: Promise<void> | undefined

  const load = (): Promise<void> => {
    if (value !== undefined) return Promise.resolve()
    if (pending !== undefined) return pending
    pending = loader().then(
      (module) => { value = module },
      (error: unknown) => {
        pending = undefined
        throw error
      },
    )
    return pending
  }

  return {
    get: (): A | undefined => value,
    load,
  }
}
