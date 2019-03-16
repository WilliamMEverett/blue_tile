
const { app, BrowserWindow, ipcMain } = require('electron')
const Player = require('./player');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

var tileArray = []
var discardedTiles = []
var factoryDisplays = []
var centerDisplay = []
var currentPlayer = null
var selectedTile = null
var numberOfDisplays = 5

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
  initializeBoard(2)

  win.webContents.send('set_number_factory_displays',numberOfDisplays)
  for (var i=0; i< factoryDisplays.length; i++) {
    win.webContents.send('configure_tile_displays',{index:i,tiles:factoryDisplays[i]})
  }
  win.webContents.send('configure_tile_displays',{index:"center",tiles:centerDisplay})
  win.webContents.send('configure_player', {index:0,player:currentPlayer})

  configureMainMessage()
}

function tile_slot_clicked(event, args) {
  var selectedArray = null
  if (args.display == "center") {
    selectedArray = centerDisplay;
  }
  else if (args.display < factoryDisplays.length) {
    selectedArray = factoryDisplays[args.display]
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
        configureMainMessage()
        return
      }

      var selectedTiles = selectedArray.filter(currentElement => currentElement.color == color)

      selectedTile = {tiles:selectedTiles,sourceArray:selectedArray}
      configureMainMessage()
  }
}

function pattern_row_clicked(event, args) {
    // win.webContents.send('log_message', "Selected pattern row " + args.row)
    if (selectedTile == null || selectedTile.tiles.length == 0) {
      return
    }
    let result = currentPlayer.placeTilesInPatternRow(selectedTile, args.row, centerDisplay)
    if (result.success) {
      var color = selectedTile.tiles[0].color
      var number = selectedTile.tiles.length
      var pluralSuffix = ""
      var pronoun = "it"
      if (number > 1) {
        pluralSuffix = "s"
        pronoun = "them"
      }
      var logMessage = "Player " + currentPlayer.playerNumber + " took " + number +
      " " + color + " tile" + pluralSuffix + " and placed " + pronoun + " in row " +
      (args.row + 1) + "."
      if (result.discard > 0) {
        logMessage += " " + result.discard + " of those went to the discard row."
      }
      if (result.firstTile) {
        logMessage += " The player also took the first player tile."
      }
      win.webContents.send('log_message', logMessage)

      selectedTile = null
      sortTileArray(centerDisplay)
      for (var i=0; i< factoryDisplays.length; i++) {
        win.webContents.send('configure_tile_displays',{index:i,tiles:factoryDisplays[i]})
      }
      win.webContents.send('configure_tile_displays',{index:"center",tiles:centerDisplay})
      win.webContents.send('configure_player', {index:0,player:currentPlayer})
      configureMainMessage()
    }
    else {
      win.webContents.send('temporary_message',{message:result.message,color:'red'})
    }
}

function configureMainMessage() {
  if (selectedTile == null) {
    win.webContents.send('main_message', "Select a tile from the displays on the top.")
  }
  else {
    var message = "You have selected " + selectedTile.tiles.length + " " + selectedTile.tiles[0].color + " tiles "
    if (selectedTile.sourceArray === centerDisplay) {
      message += "from the center."
      if (centerDisplay[0].first === true) {
        message += " You will also take the player 1 tile."
      }
    }
    else {
      var index = factoryDisplays.indexOf(selectedTile.sourceArray)
      if (index >= 0) {
        message += "from display #" + (index + 1) + "."
      }
    }
    message += " Select a pattern row (or the discard line) to place the tiles."
    win.webContents.send('main_message', message)
  }
}

function initializeBoard(numberOfPlayers) {
    discardedTiles.length = 0
    tileArray.length = 0
    factoryDisplays.length = 0
    centerDisplay.length = 0

    var colors = ['blue','red','green','black','yellow']
    colors.forEach((c) => {
      for (var i=0; i< 20; i++) {
        let newTile = new Object()
        newTile.color = c
        newTile.first = false
        tileArray.push(newTile)
      }
    })

    shuffleArray(tileArray)
    numberOfDisplays = 5
    assignTilesToDisplay()
    currentPlayer = Player.getDefaultPlayerObject()
    currentPlayer.playerNumber = 1
}

function assignTilesToDisplay() {
    factoryDisplays.length = 0
    centerDisplay.length = 0


    for (var i=0; i< numberOfDisplays; i++) {
      var newDisplay = []
      while (newDisplay.length < 4 && (tileArray.length > 0 || discardedTiles.length > 0)) {
        if (tileArray.length == 0) {
          while (discardedTiles.length > 0) {
            tileArray.push(discardedTiles.pop())
          }
          shuffleArray(tileArray)
        }
        if (tileArray.length > 0) {
          newDisplay.push(tileArray.pop())
        }
      }
      sortTileArray(newDisplay)

      factoryDisplays.push(newDisplay)
    }
    let firstTile = new Object()
    firstTile.color = 'white'
    firstTile.first = true
    centerDisplay.push(firstTile)
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
