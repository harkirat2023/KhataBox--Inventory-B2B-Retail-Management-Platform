import { describe, it, expect, beforeEach } from "vitest"
import { useStoreContext } from "@/lib/store-context"

describe("useStoreContext", () => {
  beforeEach(() => {
    useStoreContext.getState().clearActiveStore()
  })

  it("starts with null active store", () => {
    const { activeStore } = useStoreContext.getState()
    expect(activeStore).toEqual({ id: null, name: null })
  })

  it("sets active store", () => {
    useStoreContext.getState().setActiveStore({ id: 1, name: "Main Store" })
    const { activeStore } = useStoreContext.getState()
    expect(activeStore).toEqual({ id: 1, name: "Main Store" })
  })

  it("updates active store", () => {
    useStoreContext.getState().setActiveStore({ id: 1, name: "Main Store" })
    useStoreContext.getState().setActiveStore({ id: 2, name: "Branch Store" })
    const { activeStore } = useStoreContext.getState()
    expect(activeStore).toEqual({ id: 2, name: "Branch Store" })
  })

  it("clears active store", () => {
    useStoreContext.getState().setActiveStore({ id: 1, name: "Main Store" })
    useStoreContext.getState().clearActiveStore()
    const { activeStore } = useStoreContext.getState()
    expect(activeStore).toEqual({ id: null, name: null })
  })
})
