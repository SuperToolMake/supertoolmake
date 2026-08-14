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
  normal: Record<string, string> = {}
): Component => ({
  _id: id,
  _component: "@budibase/standard-components/textv2",
  _instanceName: id,
  _styles: componentStyles(normal),
  size,
  text: value,
})

const icon = (id: string, name: string, color: string, size = 28): Component => ({
  _id: id,
  _component: "@budibase/standard-components/iconphosphor",
  _instanceName: id,
  _styles: componentStyles({
    color,
    "flex-shrink": "0",
  }),
  icon: name,
  size,
  weight: "duotone",
})

const link = (
  id: string,
  label: string,
  url: string,
  normal: Record<string, string> = {}
): Component => ({
  _id: id,
  _component: "@budibase/standard-components/link",
  _instanceName: id,
  _styles: componentStyles(normal),
  text: label,
  url,
  openInNewTab: true,
  size: "L",
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
          text(`${id}-title`, title, "20px", {
            color: "#1c1e21",
            "font-weight": "700",
          }),
        ],
        {
          display: "flex",
          "flex-direction": "row",
          "align-items": "center",
          gap: "0.85rem",
        }
      ),
      text(`${id}-description`, description, "16px", {
        color: "#525860",
        "line-height": "1.55",
      }),
      link(`${id}-link`, linkLabel, url, {
        color: "#1a6cd3",
        "font-weight": "700",
      }),
    ],
    {
      background: "#ffffff",
      "border-radius": "16px",
      border: "1px solid #ebedf0",
      padding: "1.5rem",
      gap: "0.75rem",
    }
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
              text("welcome-brand-name", "SUPERTOOLMAKE", "16px", {
                color: "#1c1e21",
                "font-weight": "800",
                "letter-spacing": "0.16em",
              }),
            ],
            {
              display: "flex",
              "flex-direction": "row",
              "align-items": "center",
              gap: "0.65rem",
            }
          ),
          text("welcome-masthead-note", "OPEN SOURCE / LOW-CODE", "12px", {
            color: "#525860",
            "font-weight": "700",
            "letter-spacing": "0.12em",
          }),
        ],
        {
          display: "flex",
          "flex-direction": "row",
          "align-items": "center",
          "justify-content": "space-between",
          "flex-wrap": "wrap",
          gap: "1rem",
        }
      ),
      container(
        "welcome-hero",
        [
          text("welcome-title", "Build useful apps without the heavy stack.", "42px", {
            color: "#ffffff",
            "font-weight": "800",
            "line-height": "1.08",
          }),
          text(
            "welcome-summary",
            "SuperToolMake is a lightweight, open source platform for building forms and web apps on top of your own data.",
            "19px",
            {
              color: "#f2f2f2",
              "line-height": "1.55",
              "max-width": "680px",
            }
          ),
          container(
            "welcome-hero-links",
            [
              link("welcome-docs-link", "Read the docs", "https://supertoolmake.com/docs/", {
                background: "#ffffff",
                color: "#1c1e21",
                "border-radius": "999px",
                padding: "0.7rem 1.15rem",
                "font-weight": "800",
              }),
            ],
            {
              display: "flex",
              "flex-direction": "row",
              "flex-wrap": "wrap",
              gap: "0.75rem",
            },
            { hAlign: "left" }
          ),
        ],
        {
          background: "linear-gradient(135deg, #0a1628 0%, #134c94 50%, #1a6cd3 100%)",
          "border-radius": "24px",
          padding: "2.5rem",
          gap: "1.25rem",
        }
      ),
      container(
        "welcome-paths-section",
        [
          text("welcome-paths-title", "From connected data to a finished app.", "28px", {
            color: "#1c1e21",
            "font-weight": "800",
          }),
          text(
            "welcome-paths-summary",
            "Everything you need is organised in one workspace.",
            "16px",
            {
              color: "#525860",
              "line-height": "1.5",
            }
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
            {
              gap: "1rem",
              "margin-bottom": "2rem",
            }
          ),
        ],
        {
          gap: "0.75rem",
        }
      ),
    ],
    {
      "box-sizing": "border-box",
      "align-self": "stretch",
      "justify-self": "stretch",
      flex: "1 1 auto",
      "--grid-desktop-col-start": "1",
      "--grid-desktop-col-end": "12",
      "--grid-desktop-row-start": "1",
      "--grid-desktop-row-end": "45",
      "--grid-desktop-h-align": "stretch",
      "--grid-desktop-v-align": "stretch",
      "--grid-mobile-col-start": "1",
      "--grid-mobile-col-end": "12",
      "--grid-mobile-row-start": "1",
      "--grid-mobile-row-end": "45",
      "--grid-mobile-h-align": "stretch",
      "--grid-mobile-v-align": "stretch",
      gap: "1.5rem",
    },
    { size: "grow" }
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
        "min-height": "100vh",
        "box-sizing": "border-box",
        padding: "2rem 1.25rem 3rem",
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
