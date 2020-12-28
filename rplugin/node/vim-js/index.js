const goToDeclaration = require('./src/goToDeclaration')
const autoCD = require('./src/autoCD')
const mySqlMru = require('./src/mySqlMru')
const { init } = require('./src/api')
module.exports = plugin => {
  // plugin.setOptions({ dev: true, alwaysInit: true })
  plugin.setOptions({ dev: false })
  init(plugin)

  autoCD(plugin)
  goToDeclaration(plugin)
  // mySqlMru(plugin)
}
