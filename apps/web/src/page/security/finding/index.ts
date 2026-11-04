import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/security/code/findings/$targetId/$fingerprint`: one instance per finding. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: breadcrumbsOf,
})
