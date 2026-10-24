import { auth, EndpointGroupList, middleware } from "@supertoolmake/backend-core"

export const endpointGroupList = new EndpointGroupList()

export const builderOrAdminRoutes = endpointGroupList.group(auth.workspaceBuilderOrAdmin)
builderOrAdminRoutes.lockMiddleware()

export const builderRoutes = endpointGroupList.group(auth.builderOnly)
builderRoutes.lockMiddleware()

export const adminRoutes = endpointGroupList.group(auth.adminOnly)
adminRoutes.lockMiddleware()

export const internalRoutes = endpointGroupList.group(middleware.internalApi)
internalRoutes.lockMiddleware()

export const loggedInRoutes = endpointGroupList.group()
loggedInRoutes.lockMiddleware()
