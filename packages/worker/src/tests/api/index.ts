import type TestConfiguration from "../TestConfiguration"
import { AuthAPI } from "./auth"
import { ConfigAPI } from "./configs"
import { EmailAPI } from "./email"
import { RestoreAPI } from "./restore"
import { RolesAPI } from "./roles"
import { SelfAPI } from "./self"
import { StatusAPI } from "./status"
import { TemplatesAPI } from "./templates"
import { TenantAPI } from "./tenants"
import { UserAPI } from "./users"

export default class API {
  auth: AuthAPI
  configs: ConfigAPI
  emails: EmailAPI
  self: SelfAPI
  users: UserAPI
  status: StatusAPI
  restore: RestoreAPI
  tenants: TenantAPI
  roles: RolesAPI
  templates: TemplatesAPI

  constructor(config: TestConfiguration) {
    this.auth = new AuthAPI(config)
    this.configs = new ConfigAPI(config)
    this.emails = new EmailAPI(config)
    this.self = new SelfAPI(config)
    this.users = new UserAPI(config)
    this.status = new StatusAPI(config)
    this.restore = new RestoreAPI(config)
    this.tenants = new TenantAPI(config)
    this.roles = new RolesAPI(config)
    this.templates = new TemplatesAPI(config)
  }
}
