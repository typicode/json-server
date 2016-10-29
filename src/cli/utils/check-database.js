const arrayError = `Database should be an object, found an array.
See https://github.com/typicode/json-server for example.`

const keyError = (key) => `Found / character in database property: '${key}'
/ aren't supported and may results in routing errors.

If you need to customize default routes, see
https://github.com/typicode/json-server#add-routes`

module.exports = (obj) => {
  if (Array.isArray(obj)) {
    throw new Error(arrayError)
  }

  Object
    .keys(obj)
    .forEach(key => {
      if (key.includes('/')) {
        throw new Error(keyError(key))
      }
    })
}
