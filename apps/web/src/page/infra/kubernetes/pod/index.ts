import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { kubernetesBreadcrumbs } from "../../kit/view-tabs"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { summarySource } from "../../../../shell/source-link"

/** `/infra/kubernetes/pods/$podName`: one instance per pod name; the window and namespace arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: (model) => summarySource(model.summary.data),
	breadcrumbs: (model) => kubernetesBreadcrumbs("pods", model.search, [{ label: model.podName }]),
})
