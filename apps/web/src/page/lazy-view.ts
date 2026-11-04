import { Submodel } from "foldkit"
import type { PageViewInputs } from "./contract"
import { lazyModule } from "./lazy-module"

/**
 * Splits the page's rendering graph without changing its Model, Message or update.
 * The parent must request loadView through a Command and record the completion in
 * its Model before rendering. The fallback protects unusual direct page renders.
 */
export const lazyPageView = <Model, Message>(
  loader: () => Promise<{ readonly view: Submodel.View<Model, Message, PageViewInputs> }>,
) => {
  const deferred = lazyModule(loader)
  return {
    loadView: deferred.load,
    view: Submodel.defineView<Model, Message, PageViewInputs>((model, inputs, h) => {
      const module = deferred.get()
      return module === undefined
        ? h.empty
        : h.submodel({
            slotId: "loaded-page-view",
            model,
            view: module.view,
            viewInputs: inputs,
            toParentMessage: (message) => message,
          })
    }),
  }
}
