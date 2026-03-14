export const handleError = (err) => {
  const update = { ...err }
  return Object.keys(update).reduce((acc, key) => {
    if (update[key]) {
      acc[key] = update[key]
    }
    return acc
  }, {})
}

export const passwordsMatch = (password, confirmation) => {
  const confirm = confirmation?.trim()
  const pwd = password?.trim()
  return typeof confirm === "string" && typeof pwd === "string" && confirm == pwd
}
