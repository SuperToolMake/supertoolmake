import TestConfiguration from "../TestConfiguration"
import { AccountAPI } from "./accounts"
import { AuthAPI } from "./auth"
import { ConfigAPI } from "./configs"
import { EmailAPI } from "./email"
import { SelfAPI } from "./self"
import { UserAPI } from "./users"
import { StatusAPI } from "./status"
import { RestoreAPI } from "./restore"
import { TenantAPI } from "./tenants"
import { RolesAPI } from "./roles"
import { TemplatesAPI } from "./templates"

export default class API {
  accounts: AccountAPI
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
    this.accounts = new AccountAPI(config)
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
