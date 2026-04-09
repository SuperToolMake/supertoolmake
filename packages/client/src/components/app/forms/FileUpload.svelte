<script>
import { CoreDropzone, Helpers, ProgressCircle } from "@supertoolmake/bbui"
import { getContext, onDestroy, onMount } from "svelte"
import { builderStore } from "@/stores/builder"
import Field from "./Field.svelte"
import ExifReader from "exifreader"

export let datasourceId
export let bucket
export let folder = ""
export let field
export let label
export let disabled = false
export let validation
export let onChange
export let compressImages = false
export let imageWidth
export let compressionQuality = 80
export let maximum = 1

let fieldState
let fieldApi
let localFiles = []
let rawFiles = []

const handleFileTooLarge = () => {
  notificationStore.actions.warning(
    "Files cannot exceed 5GB. Please try again with a smaller file."
  )
}

const handleTooManyFiles = (fileLimit) => {
  notificationStore.actions.warning(`Please select a maximum of ${fileLimit} files.`)
}

// crypto.randomUUID is not available in all environments
const generateUUID = () => {
  const array = new Uint8Array(16)
  window.crypto.getRandomValues(array)

  // RFC 4122 version 4 bits
  array[6] = (array[6] & 0x0f) | 0x40
  array[8] = (array[8] & 0x3f) | 0x80

  const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Process the file input and return a serializable structure expected by
// the dropzone component to display the file
const processFiles = async (fileList) => {
  if ($builderStore.inBuilder) {
    return []
  }
  rawFiles = Array.from(fileList || [])
  return await new Promise((resolve) => {
    if (!fileList?.length) {
      return []
    }

    const processFile = (file) => {
      const key = generateUUID()

      if (!file.type?.startsWith("image")) {
        return Promise.resolve({
          name: file.name,
          type: file.type,
          key,
        })
      }

      return new Promise((res) => {
        const reader = new FileReader()
        reader.addEventListener(
          "load",
          async () => {
            const tags = await ExifReader.load(reader.result)
            res({
              url: reader.result,
              name: file.name,
              type: file.type,
              key,
              metadata: Object.fromEntries(
                Object.entries(tags).map(([key, val]) => [key, val.value])
              ),
            })
          },
          false
        )
        reader.readAsDataURL(file)
      })
    }

    Promise.all(Array.from(fileList).map(processFile)).then(resolve)
  })
}

const upload = async () => {
  if (!bucket) {
    notificationStore.actions.error("Bucket is not configured")
    return
  }

  const processedFiles = Array.from(localFiles || [])
  const fileArray = Array.from(rawFiles || [])

  if (!processedFiles.length || !fileArray.length) {
    notificationStore.actions.warning("No files to upload")
    return
  }

  loading = true
  try {
    const results = await Promise.all(
      processedFiles.map((processedFile, index) => {
        if (!processedFile.key) {
          throw new Error("File key is missing")
        }
        const rawFile = fileArray[index]
        const isImage = rawFile.type?.startsWith("image/")
        const shouldCompress = compressImages && isImage
        const ext = shouldCompress ? "avif" : rawFile.name.split(".").pop()
        const uploadKey = folder
          ? `${folder}/${processedFile.key}.${ext}`
          : `${processedFile.key}.${ext}`
        return API.externalUpload(
          datasourceId,
          bucket,
          uploadKey,
          rawFile,
          shouldCompress ? { maxWidth: imageWidth, quality: compressionQuality } : undefined
        )
      })
    )
    notificationStore.actions.success("File uploaded successfully")
    loading = false
    return results
  } catch (error) {
    notificationStore.actions.error(`Error uploading file: ${error?.message || error}`)
    loading = false
  }
}

const handleChange = (e) => {
  localFiles = e.detail
  let processedFiles = Helpers.cloneDeep(e.detail) || []
  processedFiles.forEach((file) => {
    if (file.type?.startsWith("image")) {
      delete file.url
    }
  })
  const changed = fieldApi.setValue(processedFiles)
  if (onChange && changed) {
    onChange({ value: processedFiles })
  }
}

$: {
  // If the field state is reset, clear the local files
  if (!fieldState?.value?.length) {
    localFiles = []
    rawFiles = []
  }
}

const { API, notificationStore, uploadStore } = getContext("sdk")
const component = getContext("component")

// Store raw files for upload (processed files lose the File object)
let loading = false

// 5GB cap per item sent via S3 REST API
const MaxFileSize = 1000000000 * 5

onMount(() => {
  uploadStore.actions.registerFileUpload($component.id, upload)
})

onDestroy(() => {
  uploadStore.actions.unregisterFileUpload($component.id)
})
</script>

<Field
  {label}
  {field}
  {disabled}
  {validation}
  type="fileupload"
  bind:fieldState
  bind:fieldApi
  defaultValue={[]}
>
  <div class="content" class:builder={$builderStore.inBuilder}>
    {#if fieldState}
      <CoreDropzone
        value={localFiles}
        disabled={loading || fieldState.disabled}
        error={fieldState.error}
        on:change={handleChange}
        {processFiles}
        {handleFileTooLarge}
        {handleTooManyFiles}
        {maximum}
        fileSizeLimit={MaxFileSize}
      />
    {/if}
    {#if loading}
      <div class="overlay"></div>
      <div class="loading">
        <ProgressCircle />
      </div>
    {/if}
  </div>
</Field>

<style>
  .content.builder :global(.spectrum-Dropzone) {
    pointer-events: none;
  }
  .content {
    position: relative;
  }
  .overlay,
  .loading {
    position: absolute;
    top: 0;
    height: 100%;
    width: 100%;
    display: grid;
    place-items: center;
  }
  .overlay {
    background-color: var(--spectrum-global-color-gray-50);
    opacity: 0.5;
  }
</style>
