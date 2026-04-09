import type { Screen } from "@supertoolmake/types"
import { Roles } from "@/constants/backend"
import { capitalise } from "@/helpers"
import getValidRoute from "./getValidRoute"
import { PDFScreen } from "./Screen"

const pdf = ({
  route,
  screens,
  workspaceAppId,
}: {
  route: string
  screens: Screen[]
  workspaceAppId: string
}) => {
  const validRoute = getValidRoute(screens, route, Roles.BASIC, workspaceAppId)

  const template = new PDFScreen(workspaceAppId).role(Roles.BASIC).route(validRoute).json()

  return [
    {
      data: template,
      navigationLinkLabel: validRoute === "/" ? null : capitalise(validRoute.split("/")[1]),
    },
  ]
}

export default pdf
