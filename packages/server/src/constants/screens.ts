import type { Component, Screen } from "@supertoolmake/types"

export const ONBOARDING_WELCOME_SCREEN_NAME = "onboarding-welcome-screen"

const componentStyles = (normal: Record<string, string> = {}) => ({
  normal,
  hover: {},
  active: {},
  selected: {},
})

const container = (
  id: string,
  children: Component[],
  normal: Record<string, string> = {},
  options: Record<string, unknown> = {}
): Component => ({
  _id: id,
  _component: "@budibase/standard-components/container",
  _instanceName: id,
  _styles: componentStyles(normal),
  _children: children,
  layout: "flex",
  direction: "column",
  hAlign: "stretch",
  vAlign: "top",
  ...options,
})

const text = (
  id: string,
  value: string,
  size: string,
  color?: string,
  custom?: string
): Component => ({
  _id: id,
  _component: "@budibase/standard-components/textv2",
  _instanceName: id,
  _styles: custom ? { ...componentStyles(), custom } : componentStyles(),
  size,
  ...(color ? { color } : {}),
  text: value,
})

const icon = (id: string, name: string, color: string, size = 28): Component => ({
  _id: id,
  _component: "@budibase/standard-components/iconphosphor",
  _instanceName: id,
  _styles: componentStyles(),
  icon: name,
  size,
  color,
  weight: "duotone",
})

const link = (
  id: string,
  label: string,
  url: string,
  options: Record<string, unknown> = {}
): Component => ({
  _id: id,
  _component: "@budibase/standard-components/link",
  _instanceName: id,
  _styles: componentStyles(),
  text: label,
  url,
  openInNewTab: true,
  size: "L",
  ...options,
})

const button = (id: string, label: string, url: string): Component => ({
  _id: id,
  _component: "@budibase/standard-components/button",
  _instanceName: id,
  _styles: componentStyles(),
  text: label,
  type: "overBackground",
  size: "L",
  onClick: [
    {
      "##eventHandlerType": "Navigate To",
      parameters: {
        type: "url",
        url,
        externalNewTab: true,
      },
    },
  ],
})

const feature = (
  id: string,
  iconName: string,
  title: string,
  description: string,
  url: string,
  linkLabel: string
) =>
  container(
    id,
    [
      container(
        `${id}-heading`,
        [
          icon(`${id}-icon`, iconName, "#1a6cd3"),
          text(`${id}-title`, `**${title}**`, "18px", "#1c1e21"),
        ],
        {},
        { direction: "row", hAlign: "left", vAlign: "middle", gap: "S" }
      ),
      text(`${id}-description`, description, "18px", "#525860"),
      link(`${id}-link`, linkLabel, url, {
        color: "#1a6cd3",
        bold: true,
      }),
    ],
    {
      background: "#ffffff",
      "border-color": "#ebedf0",
      "border-radius": "1rem",
      "border-style": "solid",
      "border-width": "1px",
      "padding-bottom": "16px",
      "padding-left": "16px",
      "padding-right": "16px",
      "padding-top": "16px",
      width: "420px",
    },
    { gap: "S", size: "shrink" }
  )

export function createOnboardingWelcomeScreen(workspaceAppId: string): Screen {
  const content = container(
    "welcome-content",
    [
      container(
        "welcome-masthead",
        [
          container(
            "welcome-brand",
            [
              text(
                "welcome-brand-name",
                "**SUPERTOOLMAKE**",
                "14px",
                "#1c1e21",
                "letter-spacing: 0.16em; font-weight: 800;"
              ),
            ],
            {},
            { direction: "row", hAlign: "left", vAlign: "middle", gap: "S" }
          ),
          text(
            "welcome-masthead-note",
            "**OPEN SOURCE / LOW-CODE**",
            "12px",
            "#525860",
            "letter-spacing: 0.12em; font-weight: 700;"
          ),
        ],
        {},
        {
          direction: "row",
          hAlign: "stretch",
          vAlign: "middle",
          gap: "M",
          wrap: true,
        }
      ),
      container(
        "welcome-hero",
        [
          text("welcome-title", "# Build useful apps without the heavy stack.", "24px", "#ffffff"),
          text(
            "welcome-summary",
            "SuperToolMake is a lightweight, open source platform for building forms and web apps on top of your own data.",
            "18px",
            "#f2f2f2"
          ),
          container(
            "welcome-hero-links",
            [button("welcome-docs-button", "Read the docs", "https://supertoolmake.com/docs/")],
            {},
            {
              direction: "row",
              hAlign: "left",
              vAlign: "top",
              gap: "S",
              wrap: true,
            }
          ),
        ],
        {
          "background-image": "linear-gradient(135deg, #0a1628 0%, #134c94 50%, #1a6cd3 100%)",
          "border-radius": "1rem",
          "padding-bottom": "32px",
          "padding-left": "32px",
          "padding-right": "32px",
          "padding-top": "32px",
        },
        { gap: "M" }
      ),
      container(
        "welcome-paths-section",
        [
          text(
            "welcome-paths-title",
            "From connected data to a finished app.",
            "24px",
            "#1c1e21",
            "font-weight: 800;"
          ),
          text(
            "welcome-paths-summary",
            "Everything you need is organised in one workspace.",
            "18px",
            "#525860"
          ),
          container(
            "welcome-features",
            [
              feature(
                "welcome-data",
                "database",
                "Connect your data",
                "Bring PostgreSQL, MySQL, SQL Server, REST APIs, and other connectors into one place.",
                "https://supertoolmake.com/docs/data/connecting-sql",
                "Explore data connections"
              ),
              feature(
                "welcome-apps",
                "browser",
                "Design forms and apps",
                "Assemble responsive screens and forms with a drag-and-drop builder, backed by live data.",
                "https://supertoolmake.com/docs/apps/overview",
                "Explore app building"
              ),
              feature(
                "welcome-access",
                "shield-check",
                "Control access",
                "Protect screens, tables, and queries with built-in roles or your own custom roles.",
                "https://supertoolmake.com/docs/access-control/roles",
                "Explore access control"
              ),
            ],
            { "margin-bottom": "32px", "margin-top": "32px" },
            {
              direction: "row",
              hAlign: "left",
              vAlign: "top",
              gap: "M",
              wrap: true,
            }
          ),
        ],
        {},
        { gap: "S" }
      ),
    ],
    {},
    { gap: "M", size: "grow" }
  )

  return {
    showNavigation: false,
    width: "Large",
    routing: { route: "/", roleId: "BASIC", homeScreen: true },
    name: ONBOARDING_WELCOME_SCREEN_NAME,
    workspaceAppId,
    props: {
      _id: "c38f2b9f250fb4c33965ce47e12c02a81",
      _component: "@budibase/standard-components/container",
      _styles: componentStyles({
        height: "100vh",
        "padding-bottom": "48px",
        "padding-left": "20px",
        "padding-right": "20px",
        "padding-top": "32px",
      }),
      _children: [content],
      _instanceName: "SuperToolMake Welcome",
      layout: "flex",
      direction: "column",
      hAlign: "stretch",
      vAlign: "top",
      size: "grow",
      gap: "M",
    },
  }
}
