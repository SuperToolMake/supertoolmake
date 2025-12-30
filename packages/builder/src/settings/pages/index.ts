import type { Component } from "svelte"

// General
import ProfilePage from "@/settings/pages/profile.svelte"
import UsersPage from "@/settings/pages/people/users/index.svelte"
import UserPage from "@/settings/pages/people/users/user.svelte"
import UserInvitesPage from "@/settings/pages/people/users/invites.svelte"
import PluginsPage from "@/settings/pages/plugins/index.svelte"
import EmailPage from "@/settings/pages/email.svelte"
import EmailTemplatesPage from "@/settings/pages/email/EmailTemplates.svelte"
import EmailTemplatePage from "@/settings/pages/email/Template.svelte"
import AuthPage from "@/settings/pages/auth/index.svelte"
import OrgPage from "@/settings/pages/organisation.svelte"
import VersionPage from "@/settings/pages/version.svelte"
import DiagnosticsPage from "@/settings/pages/diagnostics.svelte"
import SystemLogsPage from "@/settings/pages/systemLogs.svelte"

// App pages
import GeneralInfoPage from "@/settings/pages/general.svelte"
import AutomationsPage from "@/settings/pages/automations/automations.svelte"
import EmbedPage from "@/settings/pages/embed.svelte"

const componentMap = {
  profile: ProfilePage,
  users: UsersPage,
  user: UserPage,
  user_invites: UserInvitesPage,
  plugins: PluginsPage,
  email: EmailPage,
  email_templates: EmailTemplatesPage,
  email_template: EmailTemplatePage,
  auth: AuthPage,
  org: OrgPage,
  version: VersionPage,
  diagnostics: DiagnosticsPage,
  system_logs: SystemLogsPage,
  general_info: GeneralInfoPage,
  automations: AutomationsPage,
  embed: EmbedPage,
} satisfies Record<string, Component<any>>

export const Pages = {
  get: (key: keyof typeof componentMap): Component<any> | undefined => {
    const component = componentMap[key]
    if (!component) {
      console.error(`Component not found for key: ${key}`)
      return undefined
    }

    return component
  },
}

export const routeActions = (
  node: HTMLElement,
  target = ".route-header .page-actions"
) => {
  let targetEl = document.querySelector(target)

  if (targetEl) {
    targetEl.appendChild(node)
  }

  return {
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node)
      }
    },
  }
}
