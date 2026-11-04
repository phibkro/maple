import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/dashboards/templates`: the gallery; the selected template rides in `?template=`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	breadcrumbs: () => [{ label: "Dashboards", href: "/dashboards" }, { label: "Templates" }],
})
