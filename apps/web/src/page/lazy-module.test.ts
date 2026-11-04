import { describe, expect, it, vi } from "vitest"
import { lazyModule } from "./lazy-module"

describe("lazyModule", () => {
  it("coalesces concurrent imports and caches the result", async () => {
    let resolve!: (value: { label: string }) => void
    const loader = vi.fn(() => new Promise<{ label: string }>((done) => { resolve = done }))
    const module = lazyModule(loader)
    const first = module.load()
    expect(module.load()).toBe(first)
    expect(module.get()).toBeUndefined()
    resolve({ label: "ready" })
    await first
    expect(module.get()).toEqual({ label: "ready" })
    await module.load()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("keeps separate page imports isolated when they resolve out of order", async () => {
    let resolveA!: (value: { id: string }) => void
    let resolveB!: (value: { id: string }) => void
    const a = lazyModule(() => new Promise<{ id: string }>((resolve) => { resolveA = resolve }))
    const b = lazyModule(() => new Promise<{ id: string }>((resolve) => { resolveB = resolve }))
    const first = a.load()
    const second = b.load()
    resolveB({ id: "b" })
    await second
    expect(a.get()).toBeUndefined()
    expect(b.get()).toEqual({ id: "b" })
    resolveA({ id: "a" })
    await first
    expect(a.get()).toEqual({ id: "a" })
    expect(b.get()).toEqual({ id: "b" })
  })

  it("retries a rejected import instead of permanently caching the failure", async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ label: "recovered" })
    const module = lazyModule(loader)
    await expect(module.load()).rejects.toThrow("offline")
    expect(module.get()).toBeUndefined()
    await module.load()
    expect(module.get()).toEqual({ label: "recovered" })
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
