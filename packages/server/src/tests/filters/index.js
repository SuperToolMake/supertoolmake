const fs = require("node:fs")

function isDatasourceTest(path) {
  const content = fs.readFileSync(path, "utf8")
  return content.includes("datasourceDescribe(")
}

module.exports = {
  isDatasourceTest,
}
