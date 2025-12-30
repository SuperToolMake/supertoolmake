import hosting from "./hosting"
import backups from "./backups"
import plugins from "./plugins"

export function getCommands() {
  return [hosting, backups, plugins]
}
