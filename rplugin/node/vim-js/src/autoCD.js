const { execSync } = require('child_process')
const { getApi } = require('./api')
const path = require('path')
const os = require('os')
const { ensureFile, readJson, pathExists, writeJson } = require('fs-extra')
const dirMap = path.join(os.homedir(), '.local', 'share', 'nvim', 'vimJsAutoCd.json')

let vimEntered = false
let sessionSelectedDirectories = []
let nvimConfigDir = path.join(os.homedir(), '.dotfiles', 'config', 'nvim')
const parent = directory => directory.replace(/\/[^/]*$/, '')
const getProjectsMap = async () => await readJson(dirMap, {throws: false}) || {
  roots: {},
  locals: []
}
async function CD(dir, api) {
  const currentDir = await api.nvim_call_function('getcwd', [])
  if(dir !== currentDir) {
    api.nvim_command(`cd ${dir}`)
  }
}
async function getProjectRoot(directory) {
  if(directory === '/' || directory === os.homedir()){
    return
  }
  if(await pathExists(path.join(directory, 'package.json')) || directory === nvimConfigDir) {
    return directory
  }
  return getProjectRoot(parent(directory))
}

function getGitRoot(directory) {
  try {
    return execSync(
      'git rev-parse --show-toplevel',
      {cwd: directory}
    ).toString().trim()
  } catch (e) {
    return ''
  }
}

const isNerdTree = async (api) => {
  const ft = await api.nvim_get_option('filetype')
  console.log({ft})
  return ft === 'nerdtree'
}
const getCurrentBufferPath = api => api.nvim_eval("expand('%:p:h')")
module.exports = plugin => {
  async function cdGitRoot() {
    const api = await getApi()
    if(await isNerdTree(api)) {
      return
    }
    const root = getGitRoot(await getCurrentBufferPath(api))
    if(root) {
      CD(root, api)
      const projectsRootDicts = await getProjectsMap()
      projectsRootDicts.roots[root] = true
      projectsRootDicts.locals = projectsRootDicts.locals.filter(dir => !dir.startsWith(root))
      writeJson(dirMap, projectsRootDicts)
    }
  }

  async function cdProjectRoot() {
    if(!vimEntered) return
    const api = await getApi()
    if(await isNerdTree(api)) {
      //TODO command! CDC if &filetype == 'nerdtree' | execute 'cd /'.join(b:NERDTreeRoot.path.pathSegments, '/') | else | cd %:p:h | endif
      return
    }
    const currentBufferPath = await getCurrentBufferPath(api)
    const root = await getProjectRoot(currentBufferPath)
    if(root) {
      CD(root, api)
      const projectsRootDicts = await getProjectsMap()
      delete projectsRootDicts.roots[await getGitRoot(currentBufferPath)]
      // projectsRootDicts.locals.push(root)
      writeJson(dirMap, projectsRootDicts)
    }
  }

  async function cdCurrentPath() {
    const api = await getApi()
    if(await isNerdTree(api)) {
      //TODO if &filetype == 'nerdtree' | execute 'cd /'.join(b:NERDTreeRoot.path.pathSegments, '/') | else | cd %:p:h | endif
      //return
    }
    const root = await getCurrentBufferPath(api)
    CD(root, api)
    const projectsRootDicts = await getProjectsMap()
    delete projectsRootDicts.roots[await getGitRoot(root)]
    sessionSelectedDirectories = sessionSelectedDirectories.filter(a => !a.startsWith(root))
    sessionSelectedDirectories.push(root)
    writeJson(dirMap, projectsRootDicts)
  }

  async function onChangeDirectory() {
    const api = await getApi()
    const currentDir = await api.nvim_call_function('getcwd', [])
    sessionSelectedDirectories = sessionSelectedDirectories.filter(a => !a.startsWith(currentDir))
    sessionSelectedDirectories.push(currentDir)
  }

  async function onBufferChange() {
    if(!vimEntered) return
    const api = await getApi()
    if(await isNerdTree(api)) return
    const currentDir = await getCurrentBufferPath(api)
    const projectsRootDicts = await getProjectsMap()
    for( const path of [
      ...sessionSelectedDirectories,
      ...projectsRootDicts.locals,
      ...Object.keys(projectsRootDicts.roots)
    ].sort((a,b) => b.length - a.length) ) {
      if(currentDir.startsWith(path)) {
        CD(path, api)
        return
      }
    }
    onVimEnter()
  }

  async function onVimEnter() {
    vimEntered = true
    await ensureFile(dirMap)
    const projectsRootDicts = await getProjectsMap()
    const api = await getApi()
    const currentDir = await getCurrentBufferPath(api)
    const gitRoot = getGitRoot(currentDir)
    const projectRoot = await getProjectRoot(currentDir)
    if(gitRoot.startsWith(projectRoot)) {
      // looks like .../config/nvim/plugged/someproj
      return CD(gitRoot, api)
    }
    if(gitRoot in projectsRootDicts.roots) {
      return CD(gitRoot, api)
    }
    if(projectRoot) {
      return CD(projectRoot, api)
    }
  }

  plugin.registerFunction('AutoCDVimEnter', onVimEnter, {sync: false})
  plugin.registerFunction('CDG', cdGitRoot, {sync: false})
  plugin.registerFunction('CDR', cdProjectRoot, {sync: false})
  plugin.registerFunction('CDC', cdCurrentPath, {sync: false})
  plugin.registerFunction('OnChangeDirectory', onChangeDirectory, {sync: false})
  plugin.registerFunction('OnBufferChange', onBufferChange, {sync: false})
}
