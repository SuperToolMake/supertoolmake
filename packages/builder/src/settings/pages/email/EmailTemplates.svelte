<script lang="ts">
import { Body, Button, ButtonGroup, Layout, notifications, Table } from "@budibase/bbui"
import { downloadFile } from "@budibase/frontend-core"
import type { FetchGlobalTemplateDefinitionResponse, FindConfigResponse } from "@budibase/types"
import { onMount } from "svelte"
import { bb } from "@/stores/bb"
import { email } from "@/stores/portal/email"
import { fetchSmtp } from "./utils"

const templateSchema = {
  name: {
    displayName: "Name",
    editable: false,
  },
  category: {
    displayName: "Category",
    editable: false,
  },
}

function getEmailInfo(definitions: FetchGlobalTemplateDefinitionResponse | undefined) {
  if (!definitions) {
    return []
  }
  const entries = Object.entries(definitions.info)
  return entries.map(([key, value]) => ({ purpose: key, ...value }))
}

$: emailInfo = getEmailInfo($email.definitions)
$: hasCustom = ($email.templates || []).find((template) => template._id)

let smtpConfig: FindConfigResponse | null
let loading = false

onMount(async () => {
  try {
    smtpConfig = await fetchSmtp()
    await email.fetchTemplates()
  } catch {
    notifications.error("Error fetching email templates")
  }
})
</script>

<Layout gap="S" noPadding>
  {#if smtpConfig}
    <Layout gap="XS" noPadding>
      <Body size="S">
        SuperToolMake comes out of the box with ready-made email templates to
        help with user onboarding.
      </Body>
    </Layout>
    <div>
      <ButtonGroup>
        <Button
          quiet
          on:click={async () => {
            const downloaded = await downloadFile(
              "/api/global/template/email/export"
            )
            if (!downloaded) {
              notifications.error("Could not download email templates")
            }
          }}
        >
          Export default
        </Button>
        {#if !!hasCustom}
          <Button
            secondary
            on:click={async () => {
              const downloaded = await downloadFile(
                "/api/global/template/email/export",
                {
                  type: "custom",
                }
              )
              if (!downloaded) {
                notifications.error("Could not download email templates")
              }
            }}
          >
            Export
          </Button>
        {/if}
      </ButtonGroup>
    </div>
    <Table
      data={emailInfo}
      schema={templateSchema}
      {loading}
      on:click={({ detail }) => {
        bb.settings(`/email/templates/${detail.purpose}`)
      }}
      allowEditRows={false}
      allowSelectRows={false}
      allowEditColumns={false}
    />
  {/if}
</Layout>
