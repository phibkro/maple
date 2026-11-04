import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { kubernetesBreadcrumbs } from "../../kit/view-tabs"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/infra/kubernetes/pods`: the pod fleet. Search changes (and the peek) arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: (model) => kubernetesBreadcrumbs("pods", model.search),
})
