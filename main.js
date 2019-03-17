
const { app, BrowserWindow, ipcMain } = require('electron')
const Player = require('./player');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

var gameState = new Object()
gameState.tileArray = []
gameState.discardedTiles = []
gameState.factoryDisplays = []
gameState.centerDisplay = []
gameState.players = []
gameState.currentPlayerIndex = -1
gameState.selectedTile = null
gameState.numberOfDisplays = 5

const displayNumberLookup = {1:3,2:5,3:7,4:9}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ width: 1200, height: 800 })

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
  initializeBoard(2, gameState)

  win.webContents.send('set_number_factory_displays',gameState.numberOfDisplays)
  win.webContents.send('set_number_players',gameState.players.length)
  for (var i=0; i< gameState.factoryDisplays.length; i++) {
    win.webContents.send('configure_tile_displays',{index:i,tiles:gameState.factoryDisplays[i]})
  }
  win.webContents.send('configure_tile_displays',{index:"center",tiles:gameState.centerDisplay})

  for (var i=0; i< gameState.players.length; i++) {
    win.webContents.send('configure_player', {index:i,player:gameState.players[i]})
  }

  configureMainMessage(gameState)
  win.webContents.send('log_message', "Player " + (gameState.currentPlayerIndex + 1) + " will start")
}

function tile_slot_clicked(event, args) {
  var selectedArray = null
  if (args.display == "center") {
    selectedArray = gameState.centerDisplay;
  }
  else if (args.display < gameState.factoryDisplays.length) {
    selectedArray = gameState.factoryDisplays[args.display]
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
        configureMainMessage(gameState)
        return
      }

      var selectedTiles = selectedArray.filter(currentElement => currentElement.color == color)

      gameState.selectedTile = {tiles:selectedTiles,sourceArray:selectedArray}
      configureMainMessage(gameState)
  }
}

function pattern_row_clicked(event, args) {
    // win.webContents.send('log_message', "Selected pattern row " + args.row)
    if (gameState.selectedTile == null || gameState.selectedTile.tiles.length == 0) {
      return
    }
    if (args.player != gameState.currentPlayerIndex) {
      win.webContents.send('temporary_message',{message:
        "That is not the current player. The current player is #" + (gameState.currentPlayerIndex + 1),
        color:'red'})
      return
    }
    let player = gameState.players[gameState.currentPlayerIndex]
    let rowIndex = args.row
    if (rowIndex < player.patternRows.length) {
      if (player.patternRows[rowIndex].length >= player.patternRowSize[rowIndex]) {
        win.webContents.send('temporary_message',{message:"This row is already full.",
          color:'red'})
        return
      }
      else if (player.patternRowContainsOtherColor(gameState.selectedTile.tiles[0].color, rowIndex)) {
        win.webContents.send('temporary_message',{message:
          "You cannot place tiles in a row that contains tiles of a different color.",
          color:'red'})
        return
      }
      else if (player.wallRowContainsColor(gameState.selectedTile.tiles[0].color, rowIndex)) {
        win.webContents.send('temporary_message',{message:
          "The wall tile in this row of that color has already been filled.",
          color:'red'})
        return
      }
    }

    placeSelectedTileInRow(gameState,args.row, gameState.selectedTile)
}

function placeSelectedTileInRow(gameState, row, selectedTileDescriptor) {
  let result = gameState.players[gameState.currentPlayerIndex].placeTilesInPatternRow(
    selectedTileDescriptor, row, gameState)
    if (result.success) {
      var color = selectedTileDescriptor.tiles[0].color
      var number = selectedTileDescriptor.tiles.length
      var pluralSuffix = ""
      var pronoun = "it"
      if (number > 1) {
        pluralSuffix = "s"
        pronoun = "them"
      }
      var logMessage = "Player " + (gameState.currentPlayerIndex + 1) + " took " + number +
      " " + color + " tile" + pluralSuffix
      if (row < gameState.players[gameState.currentPlayerIndex].patternRows.length) {
        logMessage += " and placed " + pronoun + " in row " + (row + 1) + "."
      }
      else {
        logMessage += "."
      }
      if (result.discard > 0) {
        logMessage += " " + result.discard + " of those went to the discard row."
      }
      if (result.firstTile) {
        logMessage += " The player also took the first player tile."
      }
      win.webContents.send('log_message', logMessage)

      gameState.selectedTile = null
      sortTileArray(gameState.centerDisplay)
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
    gameState.currentPlayerIndex += 1
    if (gameState.currentPlayerIndex >= gameState.players.length) {
      gameState.currentPlayerIndex = 0
    }

    configureMainMessage(gameState)
}

function configureMainMessage(gameState) {
  if (gameState.selectedTile == null) {
    win.webContents.send('main_message',
    `Player ${gameState.currentPlayerIndex + 1} select a tile from the displays on the top.`)
  }
  else {
    var message = `Player ${gameState.currentPlayerIndex + 1} you have selected ${gameState.selectedTile.tiles.length} ${gameState.selectedTile.tiles[0].color} tile`
    if (gameState.selectedTile.tiles.length > 1) {
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

function initializeBoard(numberOfPlayers, gameState) {
    gameState.discardedTiles.length = 0
    gameState.tileArray.length = 0
    gameState.factoryDisplays.length = 0
    gameState.centerDisplay.length = 0
    gameState.players.length = 0

    var colors = ['blue','red','green','black','yellow']
    colors.forEach((c) => {
      for (var i=0; i< 20; i++) {
        let newTile = new Object()
        newTile.color = c
        newTile.first = false
        gameState.tileArray.push(newTile)
      }
    })

    shuffleArray(gameState.tileArray)
    gameState.numberOfDisplays = displayNumberLookup[''+numberOfPlayers]
    assignTilesToDisplay(gameState)
    for (var i =0; i< numberOfPlayers; i++) {
      let newPlayer = Player.getDefaultPlayerObject()
      newPlayer.playerNumber = i
      gameState.players.push(newPlayer)
    }
    gameState.currentPlayerIndex = 0
}

function assignTilesToDisplay(gameState) {
    gameState.factoryDisplays.length = 0
    gameState.centerDisplay.length = 0


    for (var i=0; i< gameState.numberOfDisplays; i++) {
      var newDisplay = []
      while (newDisplay.length < 4 && (gameState.tileArray.length > 0 || gameState.discardedTiles.length > 0)) {
        if (gameState.tileArray.length == 0) {
          while (gameState.discardedTiles.length > 0) {
            gameState.tileArray.push(gameState.discardedTiles.pop())
          }
          shuffleArray(gameState.tileArray)
        }
        if (gameState.tileArray.length > 0) {
          newDisplay.push(gameState.tileArray.pop())
        }
      }
      sortTileArray(newDisplay)

      gameState.factoryDisplays.push(newDisplay)
    }
    let firstTile = new Object()
    firstTile.color = 'white'
    firstTile.first = true
    gameState.centerDisplay.push(firstTile)
}

function sortTileArray(tArray) {
  var lookupMap = new Map()
  lookupMap.set('white',1000)
  tArray.forEach((e)=>{
    var currentCount = lookupMap.get(e.color)
    if (currentCount == null) {
      currentCount = 0
    }
    currentCount++
    lookupMap.set(e.color,currentCount)
  })
  tArray.sort((o1,o2)=>{
    if (lookupMap.get(o1.color) == lookupMap.get(o2.color)) {
      return ('' + o1.color).localeCompare(o2.color);
    }
    else {
      return lookupMap.get(o2.color) - lookupMap.get(o1.color)
    }
  })
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
