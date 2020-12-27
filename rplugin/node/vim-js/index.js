module.exports = plugin => {
  // plugin.setOptions({ dev: true, alwaysInit: true });
  plugin.setOptions({ dev: false });

  const getCursorPosition = () => plugin.nvim.request('nvim_win_get_cursor', [0])
  const cocJumpDefinition = () => plugin.nvim.request('nvim_call_function', ['CocAction', ['jumpDefinition']])
  const nvimTypescriptJumpDefinition = () => plugin.nvim.request('nvim_command', ['TSDef'])
  const str = (obj) => JSON.stringify(obj);

  async function jumpWithCoc(pos) {
    await cocJumpDefinition()
    const newPos = await getCursorPosition()
    return str(pos) !== str(newPos);
  }

  async function jumpWithTsServer(pos) {
    await nvimTypescriptJumpDefinition()
    await new Promise(r => setTimeout(r, 40))
    const newPos = await getCursorPosition()
    return str(pos) !== str(newPos);
  }

  async function fallbackFZF() {
    const a = await plugin.nvim.request('nvim__id_dictionary', [{a: 1}])
    console.log(a)
    const line = await plugin.nvim.line
    const pos = await getCursorPosition()
    const lineFromCursorPosition = line.substring(pos[1])
    const isFunction = /^[\w\s]*\(/.test(lineFromCursorPosition)
    const word = await plugin.nvim.request('nvim_eval', ["expand('<cword>')"])
    if(isFunction) {
      plugin.nvim.request('nvim_call_function', ['FindFunction', [word,  " --ignore '*.spec.js' --ignore '*.unit.js' --ignore '*.it.js' --ignore '*.*.spec.js' --ignore '*.*.*unit.js' --ignore '*.*.*it.js'"]])
    } else {
      const options = [
        '--preview-window up:50%',
        "--preview '$HOME/.dotfiles/config/nvim/plugged/fzf.vim/bin/preview.rb'\\ -v\\ {}",
        "--header 'CTRL-o - open without abort :: CTRL-s - toggle sort :: CTRL-g - toggle preview window'",
        "--bind 'ctrl-g:toggle-preview,ctrl-o:execute:$DOTFILES/fzf/fhelp.sh {} > /dev/tty'"
      ].join(' ')
      const down='100%'
      plugin.nvim.request('nvim_call_function', ['fzf#vim#ag', [word, {options, down}, 1]])
    }
  }

  async function jumpImport() {
    try {
      const pos = await getCursorPosition()
      const line = await plugin.nvim.line
      let fileName
      const isImport = /^\s*import\b.*from\s+['"]/.test(line)
      const isRequireOrDynamicImport = /\b(require|import)(['"].*['"])/.test(line)
      const currentBufferPath = await plugin.nvim.request('nvim_eval', ["expand('%:p')"])
      if(isImport) {
        fileName = line.replace(/.*['"](.*)['"].*/, '$1')
      } else if(isRequireOrDynamicImport) {
        fileName = line.replace(/.*\b(require|import)\(['"](.*)['"].*/, '$2')
      } 
      if(fileName) {

        // let absolutePath;
        const absolutePath = require('child_process')
          .execSync(`node -e "console.log(require.resolve('sdk-iframe-loader', {paths: ['/Users/david.susskind/projects/sdk/player-sdk']}))"`)
          .toString()
          .trim()

        if(absolutePath) {
          const word = await plugin.nvim.request('nvim_eval', ["expand('<cword>')"])
          await plugin.nvim.command(`let @/='${word}'`)
          await plugin.nvim.command(`edit ${absolutePath}`)
        }
      }
      const newPos = await getCursorPosition()
      return str(pos) !== str(newPos);
    } catch(e) {
    }
  }

  plugin.registerCommand('JSGoToDeclaration', async () => {
      debugger
    const pos = await getCursorPosition()
    const api = await plugin.nvim.requestApi()
    const line = await plugin.nvim.line
    if(await jumpWithCoc(pos)) {
      return
    }
    if(await jumpWithTsServer(pos)) {
      return
    }
    if(await jumpImport(pos)) {
      return
    }
    fallbackFZF()
  }, { sync: false });
};
