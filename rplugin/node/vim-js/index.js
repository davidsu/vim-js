const goToDeclaration = require('./src/goToDeclaration')
const { init } = require('./src/api')
module.exports = plugin => {
  plugin.setOptions({ dev: true, alwaysInit: true })
  init(plugin)
  goToDeclaration(plugin)
}
