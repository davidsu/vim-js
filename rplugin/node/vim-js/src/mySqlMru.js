const { execSync } = require('child_process')
const { getApi } = require('./api')
module.exports = plugin => {
  function readProjectsDict() {
    const sql = 'mysql -uroot --skip-column-names --batch -e "select dict from projectsRootDic where id = 1" mru_vim'
    const projectsRootDicts = JSON.parse(execSync(sql).toString().trim())
    return projectsRootDicts
  }

  async function onVimEnter() {
    const api = await getApi()
    const sql = 'mysql -uroot --skip-column-names --batch -e "select dict from projectsRootDic where id = 1" mru_vim'
    const projectsRootDicts = JSON.parse(execSync(sql).toString().trim())
    const currentBufferPath = await api.nvim_eval("expand('%:p:h')")
    const currDir = await api.nvim_call_function('utils#get_project_root', [currentBufferPath])
    if(currDir in projectsRootDicts) {
      await api.nvim_command(`cd ${projectsRootDicts[currDir]}`)
    }
  }

  plugin.registerFunction('MySqlMruVimEnter', onVimEnter, {sync: true})
  plugin.registerFunction('GetProjectsRootDict', readProjectsDict, {sync: true})
  readProjectsDict()
}
