export async function getLicensedConfig() {
  let licensedConfig: object = {}
  const defaults = {
    emailBrandingEnabled: true,
    platformTitle: undefined,
    metaDescription: undefined,
    loginHeading: undefined,
    loginButton: undefined,
    metaImageUrl: undefined,
    metaTitle: undefined,
  }

  try {
    licensedConfig = { ...defaults }
  } catch (e) {
    licensedConfig = { ...defaults }
    console.info("Could not retrieve license", e)
  }
  return licensedConfig
}
