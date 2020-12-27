const goToDeclaration = require('./src/goToDeclaration')
const mySqlMru = require('./src/mySqlMru')
const { init } = require('./src/api')
module.exports = plugin => {
  // plugin.setOptions({ dev: true, alwaysInit: true })
  plugin.setOptions({ dev: false })
  init(plugin)
  goToDeclaration(plugin)
  mySqlMru(plugin)
}
