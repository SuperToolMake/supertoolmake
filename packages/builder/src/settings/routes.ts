import { sdk } from "@budibase/shared-core"
import { GetGlobalSelfResponse } from "@budibase/types"
import { UserAvatar } from "@budibase/frontend-core"

import { type Route } from "@/types/routing"
import { Pages } from "./pages"
import { AdminState } from "@/stores/portal/admin"
import { AppMetaState } from "@/stores/builder/app"
import { PortalAppsStore } from "@/stores/portal/apps"

export const globalRoutes = (user: GetGlobalSelfResponse) => {
  return [
    {
      section: "Preferences",
      path: "profile",
      icon: {
        comp: UserAvatar,
        props: { user, size: "XS" },
      },
      comp: Pages.get("profile"),
    },
  ]
}

export const orgRoutes = (
  user: GetGlobalSelfResponse,
  admin: AdminState
): Route[] => {
  const isAdmin = user != null && sdk.users.isAdmin(user)
  const isGlobalBuilder = user != null && sdk.users.isGlobalBuilder(user)
  const cloud = admin?.cloud

  const emailRoutes: Route[] = [
    {
      path: "smtp",
      title: "SMTP",
      comp: Pages.get("email"),
    },
    {
      path: "templates",
      title: "Templates",
      comp: Pages.get("email_templates"),
      routes: [
        {
          path: ":templateId",
          title: "Template",
          comp: Pages.get("email_template"),
        },
      ],
    },
  ]

  return [
    {
      section: "Account",
      path: "account",
      icon: "sliders",
      routes: [
        {
          path: "org",
          access: () => isAdmin,
          title: "Organisation",
          comp: Pages.get("org"),
        },
      ],
    },
    {
      section: "People",
      access: () => isGlobalBuilder,
      path: "people",
      icon: "users",
      routes: [
        {
          path: "users",
          title: "Users",
          comp: Pages.get("users"),
          routes: [{ path: ":userId", comp: Pages.get("user"), title: "User" }],
        },
        {
          path: "invites",
          title: "Invites",
          comp: Pages.get("user_invites"),
        },
      ],
    },
    {
      section: "Email",
      path: "email",
      icon: "envelope",
      access: () => isAdmin,
      routes: emailRoutes,
    },
    {
      section: "Auth",
      access: () => isAdmin,
      path: "auth",
      icon: "key",
      comp: Pages.get("auth"),
    },
    {
      section: "Self host",
      access: () => !cloud && isAdmin,
      path: "self",
      icon: "computer-tower",
      routes: [
        {
          path: "version",
          comp: Pages.get("version"),
          title: "Version",
        },
        {
          path: "diagnostics",
          comp: Pages.get("diagnostics"),
          title: "Diagnostics",
        },
        {
          path: "systemLogs",
          comp: Pages.get("system_logs"),
          title: "System logs",
        },
      ],
    },
    {
      section: "Open source license",
      access: () => !cloud && isAdmin,
      path: "legal",
      icon: "gavel",
      routes: [
        {
          path: "agplv3",
          comp: Pages.get("agplv3"),
          title: "AGPLv3",
        },
      ],
    },
  ].map((entry: Route) => ({
    ...entry,
    group: "Organisation",
  }))
}

export const appRoutes = (
  appStore: AppMetaState,
  _appsStore: PortalAppsStore
): Route[] => {
  if (!appStore?.appId) {
    return []
  }

  return [
    {
      section: "General",
      icon: "sliders-horizontal",
      path: "general",
      routes: [
        { path: "info", comp: Pages.get("general_info"), title: "Info" },
      ],
    },
    {
      section: "Apps",
      icon: "layout",
      path: "app",
      routes: [{ path: "embed", comp: Pages.get("embed"), title: "Embed" }],
    },
  ].map((entry: Route) => ({
    ...entry,
    group: "Workspace",
  }))
}

// Parse out routes that shouldn't be visible if the user
// doesn't have permission or the install does not require/allow it
export const filterRoutes = (routes: Route[]): Route[] =>
  routes
    .filter(e => (typeof e.access === "function" ? e.access() : true))
    .map(route => {
      const filteredChildRoutes = route?.routes
        ? filterRoutes(route.routes)
        : []

      // Check if any child has an error
      const hasChildError = filteredChildRoutes.some(
        child => child.error?.() || false
      )

      // Check if this route itself has an error
      const hasOwnError = route.error?.() || false

      return {
        ...route,
        ...(route?.routes ? { routes: filteredChildRoutes } : {}),
        ...(hasOwnError || hasChildError ? { error: () => true } : {}),
      }
    })
