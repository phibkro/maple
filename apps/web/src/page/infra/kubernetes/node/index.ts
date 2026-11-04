import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { kubernetesBreadcrumbs } from "../../kit/view-tabs"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { summarySource } from "../../../../shell/source-link"

/** `/infra/kubernetes/nodes/$nodeName`: one instance per node; a window change arrives as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: (model) => summarySource(model.summary.data),
	breadcrumbs: (model) => kubernetesBreadcrumbs("nodes", model.search, [{ label: model.nodeName }]),
})
