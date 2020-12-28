let resolve
const apiPromise = new Promise(r => resolve = r)
const getApi = () => apiPromise
module.exports = {
  getApi,
  async init({ nvim }) {
    const api = await nvim.requestApi()
    const deserialized = api[1].functions
      .reduce((map, { name }) => {
        map[name] = (...args) => nvim.request(name, args)
        return map
      }, {})
    deserialized.___api = api[1].functions
      .reduce((map, _api) => {
        map[_api.name] = _api
        return map
      }, {})

    resolve(deserialized)
  }
}
