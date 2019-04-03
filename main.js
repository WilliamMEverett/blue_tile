
const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const Player = require('./player');
const GameState = require('./gamestate');
const PlayerAI = require('./playerai');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let gamePlayWindow
let gameConfigureWindow

var currentGameSetup
var gameS
var confirmationWin

var confirmMoves

function createGameWindow () {
  // Create the browser window.
  gamePlayWindow = new BrowserWindow({ width: 1200, height: 800 })
  // gamePlayWindow.on('ready-to-show', () => {
  //     console.log('Did finish load')
  //     gamePlayWindow.show()
  // })
  // and load the index.html of the app.
  gamePlayWindow.loadFile('index.html')


  // Open the DevTools.
  //gamePlayWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  gamePlayWindow.on('closed', () => {

    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    gamePlayWindow = null
  })

  gamePlayWindow.on('close', (e) => {
    if (gameS != null && !gameS.gameIsEnded()) {
      e.preventDefault()
      showConfirmationModal("Are you sure you want to quit? Your current game is not finished",
                        {action:"closeWindow"},{acceptText:"Yes"})
      return
    }
  })
}

function showGameSetupWindow() {
  if (gameConfigureWindow != null) {
    return
  }

  gameConfigureWindow = new BrowserWindow({ width: 400, height: 400, show: false  })

  gameConfigureWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    gameConfigureWindow = null
  })

  gameConfigureWindow.on('ready-to-show', () => {
      gameConfigureWindow.webContents.send('configure_game_start_mode', {gameConfiguration:currentGameSetup})
      setTimeout(function() {gameConfigureWindow.show()},10)
  })

  gameConfigureWindow.loadFile('game_configure.html')
}

app.on('before-quit', () => {
  if (gameS != null) {
    gameS.forceEnd = true
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

    ipcMain.on('renderer_initialized', renderer_initialized)
    ipcMain.on('tile_slot_clicked', tile_slot_clicked)
    ipcMain.on('pattern_row_clicked', pattern_row_clicked)
    ipcMain.on('confirmation_modal_cancel', confirmation_modal_cancel)
    ipcMain.on('confirmation_modal_accept', confirmation_modal_accept)
    ipcMain.on('game_start_confirm', game_start_confirm)
    ipcMain.on('game_start_cancel', game_start_cancel)

    currentGameSetup = new Object()
    currentGameSetup.players = []
    currentGameSetup.aiChoices = PlayerAI.getAllAINames()
    currentGameSetup.players.push({type:'human',aiType:currentGameSetup.aiChoices[0]})
    currentGameSetup.players.push({type:'computer',aiType:currentGameSetup.aiChoices[0]})
    currentGameSetup.players.push({type:'computer',aiType:currentGameSetup.aiChoices[0]})
    currentGameSetup.players.push({type:'computer',aiType:currentGameSetup.aiChoices[0]})
    currentGameSetup.randomizedPlayerOrder = true
    currentGameSetup.confirmMoves = true

    confirmMoves = true

    const menuTemplate = [
      {
        label: 'Blue Tile',
        submenu: [
          {
            label: 'New Game',
            click: () => {
                newGameMenu()
            }
          }, {
            type: 'separator'
          }, {
            label: 'Quit',
            click: () => {
              quitGameMenu();
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    showGameSetupWindow()
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
  if (gamePlayWindow === null && gameConfigureWindow === null) {
    showGameSetupWindow()
  }
})

function game_start_confirm(event, args) {
    currentGameSetup = args.gameConfiguration
    confirmMoves = currentGameSetup.confirmMoves

    gameS = GameState.getDefaultGameState()
    gameS.initializeBoard(currentGameSetup)

    if (gamePlayWindow == null) {
      createGameWindow()
    }
    else {
      initialConfigurationOfGameWindow(gameS)
    }
    gameConfigureWindow.close()
}

function game_start_cancel(event, args) {
  gameConfigureWindow.close()
}

function renderer_initialized(event, args) {

  initialConfigurationOfGameWindow(gameS)
}

function newGameMenu() {
  if (gamePlayWindow != null && gameS != null && !gameS.gameIsEnded()) {
    showConfirmationModal("Are you sure you want to start a new game? Your current game is not finished",
                      {action:"newGame"},{acceptText:"Yes"})
  }
  else {
    showGameSetupWindow()
  }
}

function quitGameMenu() {
  if (gamePlayWindow != null && gameS != null && !gameS.gameIsEnded()) {
    showConfirmationModal("Are you sure you want to quit? Your current game is not finished",
                      {action:"quitGame"},{acceptText:"Yes"})
  }
  else {
    app.quit();
  }
}

function confirmation_modal_accept(event, args) {
  if (BrowserWindow.fromWebContents(event.sender) === confirmationWin) {
    if (args.passBackObject.action == "placeTile") {
      confirmPlaceTile(args.passBackObject.player,args.passBackObject.row,args.passBackObject.tileDescriptor)
    }
    else if (args.passBackObject.action == "newGame") {
      showGameSetupWindow()
    }
    else if (args.passBackObject.action == "quitGame") {
      if (gameS != null) {
        gameS.forceEnd = true
      }
      setTimeout(()=>{app.quit()}, 0)
    }
    else if (args.passBackObject.action == "closeWindow") {
      if (gameS != null) {
        gameS.forceEnd = true
      }
      setTimeout(()=>{gamePlayWindow.close()}, 0)
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

  confirmationWin = new BrowserWindow({parent: gamePlayWindow, modal: true, width: 300, height: 300, show: false })
  confirmationWin.loadFile('confirmation_modal.html')
  confirmationWin.on('ready-to-show', () => {
      confirmationWin.webContents.send('configure_confirmation_modal', info)
      setTimeout(function() {confirmationWin.show()},10)
  })

  confirmationWin.on('closed', (e) => {
    if (e === confirmationWin) {
      confirmationWin = null
    } else {
      // console.log("closed received for not current window")
    }
  })
}

function initialConfigurationOfGameWindow(gameState) {
  if (gamePlayWindow == null) {
    return
  }

  gamePlayWindow.webContents.send('set_number_factory_displays',gameState.numberOfDisplays)
  gamePlayWindow.webContents.send('set_number_players',gameState.players.length)
  for (var i=0; i< gameState.factoryDisplays.length; i++) {
    gamePlayWindow.webContents.send('configure_tile_displays',{index:i,tiles:gameState.factoryDisplays[i]})
  }
  gamePlayWindow.webContents.send('configure_tile_displays',{index:"center",tiles:gameState.centerDisplay})

  for (var i=0; i< gameState.players.length; i++) {
    gamePlayWindow.webContents.send('set_player_description', {index:i,description:gameState.players[i].getDescription()})
    gamePlayWindow.webContents.send('configure_player', {index:i,player:gameState.players[i]})
  }

  gamePlayWindow.webContents.send('log_message', `Round ${gameState.currentRound}: Player ${(gameState.currentPlayerIndex + 1)} will start`)
  nextPlayerStart(gameState)
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
      gamePlayWindow.webContents.send('highlight_pattern_rows',{player:gameState.currentPlayerIndex,rows:[]})
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
    gamePlayWindow.webContents.send('highlight_pattern_rows',{player:gameState.currentPlayerIndex,rows:rowsToHighlight})
}

function tile_slot_clicked(event, args) {

  if (gameS.players[gameS.currentPlayerIndex].computerPlayer) {
    return
  }

  var selectedArray = null
  if (args.display == "center") {
    selectedArray = gameS.centerDisplay;
  }
  else if (args.display < gameS.factoryDisplays.length) {
    selectedArray = gameS.factoryDisplays[args.display]
  }
  if (selectedArray == null || args.slot < 0) {
    // gamePlayWindow.webContents.send('log_message', "Error")
    return
  }
  if (args.slot >= selectedArray.length) {
      // gamePlayWindow.webContents.send('log_message', "Clicked empty holder")
      return
  }
  else {
      let color = selectedArray[args.slot].color
      if (selectedArray[args.slot].first) {
        selectedTile = null
        gamePlayWindow.webContents.send('temporary_message', {message:"You cannot select the first player tile. " +
        "You will, however, take it if you take any other tile from the center.",color:"red"})
        configureMainMessage(gameS)
        return
      }

      var selectedTiles = selectedArray.filter(currentElement => currentElement.color == color)

      var oldSelected = gameS.selectedTile
      gameS.selectedTile = {tiles:selectedTiles, sourceArray:selectedArray, displayIndex:args.display,
      tileColor:selectedTiles[0].color, tileNumber: selectedTiles.length}
      if (oldSelected) {
        gamePlayWindow.webContents.send('highlight_tiles_in_display',{index:oldSelected.displayIndex,color:""});
      }
      gamePlayWindow.webContents.send('highlight_tiles_in_display',
      {index:gameS.selectedTile.displayIndex,color:gameS.selectedTile.tileColor});
      highlightRowBasedOnSelectedTile(gameS)
      configureMainMessage(gameS)
  }
}

function pattern_row_clicked(event, args) {
    if (gameS.players[gameS.currentPlayerIndex].computerPlayer) {
      return
    }

    // gamePlayWindow.webContents.send('log_message', "Selected pattern row " + args.row)
    if (gameS.selectedTile == null || gameS.selectedTile.tileNumber == 0) {
      return
    }
    if (args.player != gameS.currentPlayerIndex) {
      gamePlayWindow.webContents.send('temporary_message',{message:
        "That is not the current player. The current player is #" + (gameS.currentPlayerIndex + 1),
        color:'red'})
      return
    }
    let player = gameS.players[gameS.currentPlayerIndex]
    let rowIndex = args.row
    if (rowIndex < player.patternRows.length) {
      if (player.patternRows[rowIndex].length >= player.patternRowSize[rowIndex]) {
        gamePlayWindow.webContents.send('temporary_message',{message:"This row is already full.",
          color:'red'})
        return
      }
      else if (player.patternRowContainsOtherColor(gameS.selectedTile.tileColor, rowIndex)) {
        gamePlayWindow.webContents.send('temporary_message',{message:
          "You cannot place tiles in a row that contains tiles of a different color.",
          color:'red'})
        return
      }
      else if (player.wallRowContainsColor(gameS.selectedTile.tileColor, rowIndex)) {
        gamePlayWindow.webContents.send('temporary_message',{message:
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

    if (confirmMoves) {
      var message = `Player ${gameS.currentPlayerIndex + 1}, do you want to place ${tileNumber} ` +
      `${tileColor} tile${tileNumber > 1 ? 's' : ''} from ${sourceDisplay} into ${destinationRow}?${discardWarning}`

      if (gameS.selectedTile.displayIndex == "center" && (gameS.centerDisplay.findIndex((e) => e.first === true) >= 0)) {
      message += " You will also take the first player tile, which will be placed in the discard line."
      }

      gamePlayWindow.webContents.send('highlight_pattern_rows',{player:gameS.currentPlayerIndex,rows:[args.row]})

      showConfirmationModal(message,
        {player:gameS.currentPlayerIndex,action:"placeTile",row:args.row,tileDescriptor:gameS.selectedTile},{acceptText:"Yes"})
    } else {
      confirmPlaceTile(gameS.currentPlayerIndex, args.row, gameS.selectedTile)
    }
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

      gamePlayWindow.webContents.send('log_message', result.message)

      for (var i=0; i< gameState.factoryDisplays.length; i++) {
        gamePlayWindow.webContents.send('configure_tile_displays',{index:i,tiles:gameState.factoryDisplays[i]})
      }
      gamePlayWindow.webContents.send('configure_tile_displays',{index:"center",tiles:gameState.centerDisplay})
      gamePlayWindow.webContents.send('configure_player', {index:gameState.currentPlayerIndex,player:gameState.players[gameState.currentPlayerIndex]})

      if (gameState.players[gameState.currentPlayerIndex].computerPlayer) {
        setTimeout(function () { prepareForNextPlayer(gameState) },3000)
      }
      else {
        prepareForNextPlayer(gameState)
      }


    }
    else {
      gamePlayWindow.webContents.send('temporary_message',{message:result.message,color:'red'})
    }
}

function prepareForNextPlayer(gameState) {
    if (gamePlayWindow == null) {
      return
    }

    gamePlayWindow.webContents.send('select_player',{index:-1})
    let res = gameState.prepareForNextPlayer()
    if (res.roundEnd === true) {
      gamePlayWindow.webContents.send('log_message', res.message)
      gamePlayWindow.webContents.send('main_message', "Wall tiling . . .")
      setTimeout(function() {performWallTiling(gameState)}, 1000)
    }
    else {
      nextPlayerStart(gameState)
    }

}

function performWallTiling(gameState) {
    if (gamePlayWindow == null) {
      return
    }

    let nextFirstPlayer = gameState.nextFirstPlayer()
    let messages = gameState.performWallTiling()
    messages.forEach(e => gamePlayWindow.webContents.send('log_message', e))

    // gamePlayWindow.webContents.send('log_message', `Tiles:${gameState.tileArray.length} Discard:${gameState.discardedTiles.length}`)

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
        gamePlayWindow.webContents.send('configure_tile_displays',{index:i,tiles:gameState.factoryDisplays[i]})
      }
      gamePlayWindow.webContents.send('configure_tile_displays',{index:"center",tiles:gameState.centerDisplay})

      for (var i=0; i< gameState.players.length; i++) {
        gamePlayWindow.webContents.send('configure_player', {index:i,player:gameState.players[i]})
      }

      gamePlayWindow.webContents.send('log_message', `Round ${gameState.currentRound}: Player ${(gameState.currentPlayerIndex + 1)} will start`)

      nextPlayerStart(gameState)
    }
}

function nextPlayerStart(gameState) {
    var player = gameState.players[gameState.currentPlayerIndex]
    if (!player.computerPlayer) {
      gamePlayWindow.webContents.send('select_player',{index:gameState.currentPlayerIndex})
      configureMainMessage(gameState)
    }
    else {
      configureMainMessage(gameState)
      var move = player.playerAI.moveForGamestate(player.deepCopy(),gameState.deepCopy())
      if (move == null) {
        console.log("Error: AI could not make move")
        gamePlayWindow.webContents.send('log_message',"Error: AI could not make move");
      }
      else {
        placeSelectedTileInRow(gameState,move.row,move.tileDescriptor)
      }
    }
}

function performEndOfGame(gameState) {
  gamePlayWindow.webContents.send('log_message', "End of Game")
  let messages = gameState.calculateFinalBonusPoints()
  messages.forEach(e => gamePlayWindow.webContents.send('log_message', e))
  for (var i=0; i< gameState.players.length; i++) {
    gamePlayWindow.webContents.send('configure_player', {index:i,player:gameState.players[i]})
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

  gamePlayWindow.webContents.send('log_message', message)
  gamePlayWindow.webContents.send('main_message', "Game Over. " + message)
}

function configureMainMessage(gameState) {
  if (gameState.currentPlayerIndex >= 0 && gameState.players[gameState.currentPlayerIndex].computerPlayer) {
    gamePlayWindow.webContents.send('main_message',
    `Player ${gameState.currentPlayerIndex + 1} (computer player) is moving.`)
  }
  else if (gameState.selectedTile == null) {
    gamePlayWindow.webContents.send('main_message',
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
    gamePlayWindow.webContents.send('main_message', message)
  }
}
