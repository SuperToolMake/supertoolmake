import "../core/utilities/mocks"
import * as context from "../../src/context"

class DBTestConfiguration {
  tenantId: string

  constructor() {
    this.tenantId = context.DEFAULT_TENANT_ID
  }

  // TENANCY

  doInTenant<T>(task: () => Promise<T>) {
    return context.doInTenant(this.tenantId, () => {
      return task()
    })
  }

  getTenantId() {
    try {
      return context.getTenantId()
    } catch {
      return this.tenantId!
    }
  }
}

export default DBTestConfiguration
