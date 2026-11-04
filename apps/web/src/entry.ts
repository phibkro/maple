// First: takes an OAuth return's fragment off the URL before anything else reads it.
import "./platform/oauth-return-boot"
import "./styles.css"

import { Runtime } from "foldkit"
import submodelBuildId from "virtual:foldkit-submodels/build-id"
import type { UrlRequest } from "foldkit/navigation"
import type { Url } from "foldkit/url"
import { trackAvatarImageLoads } from "@maple/views/ui/avatar-image"
import { crashView } from "./crash/view"
import { labEnabled, labPathOf, startLab } from "./lab/boot"
import { Flags, flags, createProgram, Message } from "./main"
import { ResourcesLive } from "./platform/resources"
import { instrument } from "./platform/telemetry"

trackAvatarImageLoads()

const container = document.getElementById("app") ?? document.body

const startApplication = () => {
	const { Model, init, update, view, subscriptions, dynamicSubscriptions, prepareModel, resumeModel } =
		createProgram({
			buildId: submodelBuildId,
		})
	return Runtime.run(
		Runtime.makeApplication(
			instrument({
				Model,
				Flags,
				init,
				update,
				view,
				subscriptions,
				dynamicSubscriptions,
				prepareModel,
				resumeModel,
				resources: ResourcesLive,
				container,
				routing: {
					// Typed: `instrument` passes the config through, so Foldkit cannot infer them.
					onUrlRequest: (request: UrlRequest) => Message.ClickedLink({ request }),
					onUrlChange: (url: Url) => Message.ChangedUrl({ url }),
				},
				devTools: { Message },
				// `instrument` wraps `crash.report` with the `foldkit.crash` span; this only adds the page.
				crash: { view: crashView },
			}),
		),
		{ flags },
	)
}

// `/lab/<path>` boots that lab page's own program instead of the app (scenarios, benches).
const labPath = labEnabled ? labPathOf(location.pathname) : undefined
if (labPath === undefined) startApplication()
else void startLab(labPath, container)
