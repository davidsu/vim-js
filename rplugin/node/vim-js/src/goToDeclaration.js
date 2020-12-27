const {getApi} = require('./api')
module.exports = plugin => {
  let api
  const getCursorPosition = () => api.nvim_win_get_cursor(0)
  const str = (obj) => JSON.stringify(obj)

  async function jumpWithCoc(pos) {
    await api.nvim_call_function('CocAction', ['jumpDefinition'])
    const newPos = await getCursorPosition()
    return str(pos) !== str(newPos)
  }

  async function jumpWithTsServer(pos) {
    await api.nvim_command('TSDef')
    await new Promise(r => setTimeout(r, 40))
    const newPos = await getCursorPosition()
    return str(pos) !== str(newPos)
  }

  async function fallbackFZF() {
    const line = await plugin.nvim.line
    const pos = await getCursorPosition()
    const lineFromCursorPosition = line.substring(pos[1])
    const isFunction = /^[\w\s]*\(/.test(lineFromCursorPosition)
    const word = await api.nvim_eval("expand('<cword>')")
    if(isFunction) {
      api.nvim_call_function('FindFunction', [word,  ' --ignore \'*.spec.js\' --ignore \'*.unit.js\' --ignore \'*.it.js\' --ignore \'*.*.spec.js\' --ignore \'*.*.*unit.js\' --ignore \'*.*.*it.js\''])
    } else {
      const options = [
        '--preview-window up:50%',
        '--preview \'$HOME/.dotfiles/config/nvim/plugged/fzf.vim/bin/preview.rb\'\\ -v\\ {}',
        '--header \'CTRL-o - open without abort :: CTRL-s - toggle sort :: CTRL-g - toggle preview window\'',
        '--bind \'ctrl-g:toggle-preview,ctrl-o:execute:$DOTFILES/fzf/fhelp.sh {} > /dev/tty\''
      ].join(' ')
      const down='100%'
      api.nvim_call_function('fzf#vim#ag', [word, {options, down}, 1])
    }
  }

  async function jumpImport() {
    try {
      const pos = await getCursorPosition()
      let fileName
      const line = await plugin.nvim.line
      const isImport = /^\s*import\b.*from\s+['"]/.test(line)
      const isRequireOrDynamicImport = /\b(require|import)\((['"].*['"])/.test(line)
      const currentBufferPath = await api.nvim_eval('expand(\'%:p\')')
      if(isImport) {
        fileName = line.replace(/.*['"](.*)['"].*/, '$1')
      } else if(isRequireOrDynamicImport) {
        fileName = line.replace(/.*\b(require|import)\(['"](.*)['"].*/, '$2')
      } 
      if(fileName) {
        const absolutePath = require('child_process')
          .execSync(`node -e 'console.log(require.resolve("sdk-iframe-loader", {paths: ["${currentBufferPath}"]}))'`)
          .toString()
          .trim()

        if(absolutePath) {
          const word = await api.nvim_eval("expand('<cword>')")
          await plugin.nvim.command(`let @/='${word}'`)
          await plugin.nvim.command(`edit ${absolutePath}`)
        }
      }
      const newPos = await getCursorPosition()
      return str(pos) !== str(newPos)
    } catch(e) { //eslint-disable-line 
    }
  }

  plugin.registerCommand('JSGoToDeclaration', async () => {
    api = await getApi()
    const pos = await getCursorPosition()
    await jumpWithCoc(pos) || 
      await jumpWithTsServer(pos) ||
      await jumpImport(pos) ||
      fallbackFZF()
  }, { sync: false })
}
