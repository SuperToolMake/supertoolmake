<script>
import { Dropzone, notifications } from "@supertoolmake/bbui"
import { API } from "@/api"

export let value = []
export let label
export let fileSizeLimit = undefined

async function processFiles(fileList) {
  let data = new FormData()
  for (let i = 0; i < fileList.length; i++) {
    data.append("file", fileList[i])
  }
  try {
    return await API.uploadBuilderAttachment(data)
  } catch (error) {
    notifications.error(error.message || "Failed to upload attachment")
    return []
  }
}
</script>

<Dropzone
  bind:value
  {label}
  {...$$restProps}
  {processFiles}
  {fileSizeLimit}
  on:change
/>
