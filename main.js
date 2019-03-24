
const { app, BrowserWindow, ipcMain } = require('electron')
const Player = require('./player');
const GameState = require('./gamestate');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
var gameS
var confirmationWin

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ width: 1200, height: 800 })
  // win.on('ready-to-show', () => {
  //     console.log('Did finish load')
  //     win.show()
  // })
  // and load the index.html of the app.
  win.loadFile('index.html')


  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

    ipcMain.on('renderer_initialized', renderer_initialized)
    ipcMain.on('tile_slot_clicked', tile_slot_clicked)
    ipcMain.on('pattern_row_clicked', pattern_row_clicked)
    ipcMain.on('confirmation_modal_cancel', confirmation_modal_cancel)
    ipcMain.on('confirmation_modal_accept', confirmation_modal_accept)

    createWindow()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

function renderer_initialized(event, args) {

  gameS = GameState.getDefaultGameState()
  gameS.initializeBoard(2)

  win.webContents.send('set_number_factory_displays',gameS.numberOfDisplays)
  win.webContents.send('set_number_players',gameS.players.length)
  for (var i=0; i< gameS.factoryDisplays.length; i++) {
    win.webContents.send('configure_tile_displays',{index:i,tiles:gameS.factoryDisplays[i]})
  }
  win.webContents.send('configure_tile_displays',{index:"center",tiles:gameS.centerDisplay})

  for (var i=0; i< gameS.players.length; i++) {
    win.webContents.send('configure_player', {index:i,player:gameS.players[i]})
  }

  win.webContents.send('log_message', `Round ${gameS.currentRound}: Player ${(gameS.currentPlayerIndex + 1)} will start`)
  nextPlayerStart(gameS)
}

function confirmation_modal_accept(event, args) {
  if (BrowserWindow.fromWebContents(event.sender) === confirmationWin) {
    if (args.passBackObject.action == "placeTile") {
      confirmPlaceTile(args.passBackObject.player,args.passBackObject.row,args.passBackObject.tileDescriptor)
    }
    confirmationWin.destroy()
    confirmationWin = null
  }
  else {
    // console.log("received confirmation from other window")
  }
}

function confirmation_modal_cancel(event, args) {
  if (BrowserWindow.fromWebContents(event.sender) === confirmationWin) {
    if (args.passBackObject.action == "placeTile") {
      cancelPlaceTile(args.passBackObject.player,args.passBackObject.row,args.passBackObject.tileDescriptor)
    }
    confirmationWin.destroy()
    confirmationWin = null
  }
  else {
    // console.log("received cancel from other window")
  }
}

function showConfirmationModal(text, passBackObject, options) {
  if (confirmationWin) {
    confirmationWin.destroy()
    confirmationWin = null
  }

  let info = new Object()
  info.text = text
  info.passBackObject = passBackObject
  if (options) {
    info.acceptText = options.acceptText
    info.cancelText = options.cancelText
  }

  confirmationWin = new BrowserWindow({parent: win, modal: true, width: 300, height: 300, show: false })
  confirmationWin.loadFile('confirmation_modal.html')
  confirmationWin.on('ready-to-show', () => {
      confirmationWin.webContents.send('configure_confirmation_modal', info)
      confirmationWin.show()
  })

  confirmationWin.on('closed', (e) => {
    if (e === confirmationWin) {
      confirmationWin = null
    } else {
      // console.log("closed received for not current window")
    }
  })
}

function confirmPlaceTile(player,row,selectedTile) {
    if (player != gameS.currentPlayerIndex) {
      console.log("Received place tile callback for non-current player.")
      return
    }
    placeSelectedTileInRow(gameS,row, selectedTile)
}

function cancelPlaceTile(player,row,selectedTile) {
    if (player != gameS.currentPlayerIndex) {
      console.log("Received place tile callback for non-current player.")
      return
    }
    highlightRowBasedOnSelectedTile(gameS)
}

function highlightRowBasedOnSelectedTile(gameState) {

    if (gameState.selectedTile == null) {
      win.webContents.send('highlight_pattern_rows',{player:gameState.currentPlayerIndex,rows:[]})
      return
    }
    let player = gameState.players[gameState.currentPlayerIndex]
    var rowsToHighlight = []
    for (var i=0; i < player.patternRows.length; i++) {
      if (player.canPlaceTileInPatternRow({color:gameState.selectedTile.tileColor},i)) {
        rowsToHighlight.push(i)
      }
    }
    rowsToHighlight.push(player.patternRows.length)
    win.webContents.send('highlight_pattern_rows',{player:gameState.currentPlayerIndex,rows:rowsToHighlight})
}

function tile_slot_clicked(event, args) {

  var selectedArray = null
  if (args.display == "center") {
    selectedArray = gameS.centerDisplay;
  }
  else if (args.display < gameS.factoryDisplays.length) {
    selectedArray = gameS.factoryDisplays[args.display]
  }
  if (selectedArray == null || args.slot < 0) {
    // win.webContents.send('log_message', "Error")
    return
  }
  if (args.slot >= selectedArray.length) {
      // win.webContents.send('log_message', "Clicked empty holder")
      return
  }
  else {
      let color = selectedArray[args.slot].color
      if (selectedArray[args.slot].first) {
        selectedTile = null
        win.webContents.send('temporary_message', {message:"You cannot select the first player tile. " +
        "You will, however, take it if you take any other tile from the center.",color:"red"})
        configureMainMessage(gameS)
        return
      }

      var selectedTiles = selectedArray.filter(currentElement => currentElement.color == color)

      var oldSelected = gameS.selectedTile
      gameS.selectedTile = {tiles:selectedTiles, sourceArray:selectedArray, displayIndex:args.display,
      tileColor:selectedTiles[0].color, tileNumber: selectedTiles.length}
      if (oldSelected) {
        win.webContents.send('highlight_tiles_in_display',{index:oldSelected.displayIndex,color:""});
      }
      win.webContents.send('highlight_tiles_in_display',
      {index:gameS.selectedTile.displayIndex,color:gameS.selectedTile.tileColor});
      highlightRowBasedOnSelectedTile(gameS)
      configureMainMessage(gameS)
  }
}

function pattern_row_clicked(event, args) {
    // win.webContents.send('log_message', "Selected pattern row " + args.row)
    if (gameS.selectedTile == null || gameS.selectedTile.tileNumber == 0) {
      return
    }
    if (args.player != gameS.currentPlayerIndex) {
      win.webContents.send('temporary_message',{message:
        "That is not the current player. The current player is #" + (gameS.currentPlayerIndex + 1),
        color:'red'})
      return
    }
    let player = gameS.players[gameS.currentPlayerIndex]
    let rowIndex = args.row
    if (rowIndex < player.patternRows.length) {
      if (player.patternRows[rowIndex].length >= player.patternRowSize[rowIndex]) {
        win.webContents.send('temporary_message',{message:"This row is already full.",
          color:'red'})
        return
      }
      else if (player.patternRowContainsOtherColor(gameS.selectedTile.tileColor, rowIndex)) {
        win.webContents.send('temporary_message',{message:
          "You cannot place tiles in a row that contains tiles of a different color.",
          color:'red'})
        return
      }
      else if (player.wallRowContainsColor(gameS.selectedTile.tileColor, rowIndex)) {
        win.webContents.send('temporary_message',{message:
          "The wall tile in this row of that color has already been filled.",
          color:'red'})
        return
      }
    }

    var tileColor = gameS.selectedTile.tileColor
    var tileNumber = gameS.selectedTile.tileNumber
    var displayName = ""

    var sourceDisplay = ""
    if (gameS.selectedTile.displayIndex == "center") {
      sourceDisplay = "the center display"
    }
    else {
      sourceDisplay = `display #${gameS.selectedTile.displayIndex + 1}`
    }

    var destinationRow = `pattern row ${args.row + 1}`
    var discardWarning = ""
    if (args.row >= gameS.players[gameS.currentPlayerIndex].patternRows.length) {
      destinationRow = 'the discard line'
    }
    else {
      var overflowNumber = gameS.players[gameS.currentPlayerIndex].patternRows[args.row].length + tileNumber
      - gameS.players[gameS.currentPlayerIndex].patternRowSize[args.row]
      if (overflowNumber > 0) {
          discardWarning = ` ${overflowNumber} of those tiles will go in the discard line.`
      }
    }

    var message = `Player ${gameS.currentPlayerIndex + 1}, do you want to place ${tileNumber} ` +
    `${tileColor} tile${tileNumber > 1 ? 's' : ''} from ${sourceDisplay} into ${destinationRow}?${discardWarning}`

    if (gameS.selectedTile.displayIndex == "center" && (gameS.centerDisplay.findIndex((e) => e.first === true) >= 0)) {
      message += " You will also take the first player tile, which will be placed in the discard line."
    }

    win.webContents.send('highlight_pattern_rows',{player:gameS.currentPlayerIndex,rows:[args.row]})

    showConfirmationModal(message,
      {player:gameS.currentPlayerIndex,action:"placeTile",row:args.row,tileDescriptor:gameS.selectedTile},{acceptText:"Yes"})
}

function placeSelectedTileInRow(gameState, row, selectedTileDescriptor) {
  if (selectedTileDescriptor.displayIndex == 'center') {
    selectedTileDescriptor.sourceArray = gameS.centerDisplay
  }
  else if (selectedTileDescriptor.displayIndex >= 0 && selectedTileDescriptor.displayIndex < gameS.factoryDisplays.length) {
    selectedTileDescriptor.sourceArray = gameS.factoryDisplays[selectedTileDescriptor.displayIndex]
  }
  else {
    console.log("Invalid display index in tile placing.")
    return
  }

  let result = gameState.placeSelectedTileInRow(row, selectedTileDescriptor)
    if (result.success) {

      win.webContents.send('log_message', result.message)

      for (var i=0; i< gameState.factoryDisplays.length; i++) {
        win.webContents.send('configure_tile_displays',{index:i,tiles:gameState.factoryDisplays[i]})
      }
      win.webContents.send('configure_tile_displays',{index:"center",tiles:gameState.centerDisplay})
      win.webContents.send('configure_player', {index:gameState.currentPlayerIndex,player:gameState.players[gameState.currentPlayerIndex]})

      prepareForNextPlayer(gameState)

    }
    else {
      win.webContents.send('temporary_message',{message:result.message,color:'red'})
    }
}

function prepareForNextPlayer(gameState) {

    win.webContents.send('select_player',{index:-1})
    let res = gameState.prepareForNextPlayer()
    if (res.roundEnd === true) {
      win.webContents.send('log_message', res.message)
      performWallTiling(gameState)
    }
    else {
      nextPlayerStart(gameState)
    }

}

function performWallTiling(gameState) {

    let nextFirstPlayer = gameState.nextFirstPlayer()
    let messages = gameState.performWallTiling()
    messages.forEach(e => win.webContents.send('log_message', e))

    if (gameState.gameIsEnded() === true) {
      performEndOfGame(gameState)
      return
    }
    else {
      gameState.currentRound += 1
      if (nextFirstPlayer >= 0) {
        gameState.currentPlayerIndex = nextFirstPlayer
      }
      else {
        gameState.advanceToNextPlayer()
      }
      gameState.assignTilesToDisplay(gameState)

      for (var i=0; i< gameState.factoryDisplays.length; i++) {
        win.webContents.send('configure_tile_displays',{index:i,tiles:gameState.factoryDisplays[i]})
      }
      win.webContents.send('configure_tile_displays',{index:"center",tiles:gameState.centerDisplay})

      for (var i=0; i< gameState.players.length; i++) {
        win.webContents.send('configure_player', {index:i,player:gameState.players[i]})
      }

      win.webContents.send('log_message', `Round ${gameState.currentRound}: Player ${(gameState.currentPlayerIndex + 1)} will start`)

      nextPlayerStart(gameState)
    }
}

function nextPlayerStart(gameState) {
    win.webContents.send('select_player',{index:gameState.currentPlayerIndex})
    configureMainMessage(gameState)
}

function performEndOfGame(gameState) {
  win.webContents.send('log_message', "End of Game")
  let messages = gameState.calculateFinalBonusPoints()
  messages.forEach(e => win.webContents.send('log_message', e))
  for (var i=0; i< gameState.players.length; i++) {
    win.webContents.send('configure_player', {index:i,player:gameState.players[i]})
  }

  let winningPlayers = gameState.winningPlayers()
  var message = ""
  if (winningPlayers.length == 1) {
    message = `Player ${winningPlayers[0].playerNumber + 1} wins.`
  }
  else if (winningPlayers.length > 1) {
    var playerNumberString = ""
    winningPlayers.forEach( (e,i) => {
      if (i > 0) {
        playerNumberString += " and "
      }
      playerNumberString += '' + (e.playerNumber + 1)
    })
    message = `Tie between players ${playerNumberString}.`
  }

  win.webContents.send('log_message', message)
  win.webContents.send('main_message', "Game Over. " + message)
}

function configureMainMessage(gameState) {
  if (gameState.selectedTile == null) {
    win.webContents.send('main_message',
    `Player ${gameState.currentPlayerIndex + 1} select a tile from the displays on the top.`)
  }
  else {
    var message = `Player ${gameState.currentPlayerIndex + 1} you have selected ${gameState.selectedTile.tileNumber} ${gameState.selectedTile.tileColor} tile`
    if (gameState.selectedTile.tileNumber > 1) {
      message += "s"
    }
    if (gameState.selectedTile.sourceArray === gameState.centerDisplay) {
      message += " from the center."
      if (gameState.centerDisplay.findIndex((e) => e.first === true) > -1) {
        message += " You will also take the player 1 tile."
      }
    }
    else {
      var index = gameState.factoryDisplays.indexOf(gameState.selectedTile.sourceArray)
      if (index >= 0) {
        message += ` from display #${(index + 1)}.`
      }
    }
    message += " Select a pattern row (or the discard line) to place the tiles."
    win.webContents.send('main_message', message)
  }
}
