let resolve
const apiPromise = new Promise(r => resolve = r)
const getApi = () => apiPromise
module.exports = {
  getApi,
  async init({ nvim }) {
    const api = await nvim.requestApi()
    const deserialized = api[1].functions
      .map(a => a.name)
      .reduce((map, name) => {
        map[name] = (...args) => nvim.request(name, args)
        return map
      }, {})
    resolve(deserialized)
  }
}
