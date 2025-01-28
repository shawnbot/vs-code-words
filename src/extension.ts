import * as vscode from 'vscode'

export async function activate(context: vscode.ExtensionContext) {
  // const { syllableCount } = await import('text-readability')

  const { window } = vscode
  const decorations = new Map<string, vscode.TextEditorDecorationType>()
  let enabled = false

  context.subscriptions.push(
    vscode.commands.registerCommand('wordy.hilite', () => {
      enabled = true
      update()
    }),
    vscode.commands.registerCommand('wordy.clear', () => {
      clear()
      enabled = false
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (enabled) {
        update()
      }
    })
	)

  function update() {
    const editor = window.activeTextEditor
    if (!editor?.document) {
      console.warn('no active editor document; bailing on update()')
      return
    }

    const { document } = editor

    // const path = document.uri.path
    // window.showInformationMessage(`Hello, ${path}!`)

    const text = document.getText()
    const pattern = new RegExp(/\w+([’'][a-z]{1,2})?[\!\?]*/ig)
    const wordRanges = new Map<string, vscode.Range[]>()
    console.log('updating...')
    for (const match of text.matchAll(pattern)) {
      const word = match[0]
      // console.log('got word "%s" @ %d..%d', word, match.index, match.index + word.length)
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + word.length)
      )
      if (wordRanges.has(word)) {
        wordRanges.get(word)?.push(range)
      } else {
        wordRanges.set(word, [range])
      }
    }

    for (const [word, ranges] of wordRanges.entries()) {
      const deco = getDecoration(word, ranges.length)
      editor.setDecorations(deco, ranges)            
    }

    const remove = Array.from(decorations.keys()).filter(word => !wordRanges.has(word))
    for (const word of remove) {
      const deco = getDecoration(word)
      editor.setDecorations(deco, [])
      decorations.delete(word)
      deco.dispose()
    }
  }

  function clear() {
    for (const [key, deco] of decorations.entries()) {
      decorations.delete(key)
      window.activeTextEditor?.setDecorations(deco, [])
      deco.dispose()
    }
  }

  function getDecoration(word: string, count?: number): vscode.TextEditorDecorationType {
    if (decorations.has(word)) {
      return decorations.get(word) as vscode.TextEditorDecorationType
    } else {
      const [fg, bg] = getWordColors(word, count)
      console.log('highlighting word "%s" (x %d) with color:', word, count || 1, bg)
      const deco = window.createTextEditorDecorationType({
        color: fg,
        backgroundColor: bg,
        opacity: '80%'
      })
      decorations.set(word, deco)
      return deco
    }
  }

  function getWordColors(word: string, count?: number) {
    const red = map(word.length, 1, 20, 40, 255)
    // A : z :: 0 : 255
    const blue = map(word.charCodeAt(0), 65, 122, 0, 128)
    const green = map(count || 1, 1, 10, 0, 128)
    return [
      '#fff',
      hex(red, blue, green)
    ]
  }

  function hex(r: number, g: number, b: number) {
    return '#' + [r, g, b].map(
      n => Math.round(n).toString(16).padStart(2, '0')
    ).join('')
  }

  function map(v: number, ia: number, ib: number, oa: number, ob: number, clamp = true) {
    if (clamp) {
      v = Math.max(ia, Math.min(v, ib))
    }
    return oa + (ob - oa) * (v - ia) / (ib - ia)
  }
}

