autocmd VimEnter * call AutoCDVimEnter()
autocmd DirChanged * call OnChangeDirectory()
autocmd BufWinEnter * call OnBufferChange()
autocmd WinEnter * call OnBufferChange()
