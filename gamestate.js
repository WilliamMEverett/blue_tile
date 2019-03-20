
module.exports = {
  getDefaultGameState: _getDefaultGameState
}

const Player = require('./player');

const displayNumberLookup = {1:3,2:5,3:7,4:9}

function _getDefaultGameState() {
    var gameState = new Object()
    gameState.tileArray = []
    gameState.discardedTiles = []
    gameState.factoryDisplays = []
    gameState.centerDisplay = []
    gameState.players = []
    gameState.currentPlayerIndex = -1
    gameState.selectedTile = null
    gameState.numberOfDisplays = 5
    gameState.currentRound = 0

    gameState.initializeBoard = function(numberPlayers) {
      this.discardedTiles.length = 0
      this.tileArray.length = 0
      this.factoryDisplays.length = 0
      this.centerDisplay.length = 0
      this.players.length = 0

      var colors = ['blue','red','green','black','yellow']
      colors.forEach((c) => {
        for (var i=0; i< 20; i++) {
          let newTile = new Object()
          newTile.color = c
          newTile.first = false
          this.tileArray.push(newTile)
        }
      })

      shuffleArray(this.tileArray)
      this.numberOfDisplays = displayNumberLookup[''+numberPlayers]
      this.assignTilesToDisplay()
      for (var i =0; i< numberPlayers; i++) {
        let newPlayer = Player.getDefaultPlayerObject()
        newPlayer.playerNumber = i
        this.players.push(newPlayer)
      }
      this.currentPlayerIndex = 0
      this.currentRound = 1

    }

    gameState.placeSelectedTileInRow = function(row, selectedTileDescriptor) {
      let result = this.players[this.currentPlayerIndex].placeTilesInPatternRow(
        selectedTileDescriptor, row, this)
      if (result.success) {
        this.selectedTile = null
        sortTileArray(this.centerDisplay)

        var color = selectedTileDescriptor.tiles[0].color
        var number = selectedTileDescriptor.tiles.length
        var pluralSuffix = ""
        var pronoun = "it"
        if (number > 1) {
          pluralSuffix = "s"
          pronoun = "them"
        }
        var logMessage = "Player " + (this.currentPlayerIndex + 1) + " took " + number +
        " " + color + " tile" + pluralSuffix
        if (row < this.players[this.currentPlayerIndex].patternRows.length) {
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
        result.message = logMessage
      }
      return result
    }

    gameState.prepareForNextPlayer = function() {
      //check if factory displays are empty
      var displayContainsTiles = false
      if (this.factoryDisplays.findIndex((e) => e.length > 0) >= 0) {
        displayContainsTiles = true
      }
      if (!displayContainsTiles) {
        if (this.centerDisplay.findIndex((e) => e.first != true) >= 0) {
          displayContainsTiles = true
        }
      }

      if (!displayContainsTiles) {
        return {roundEnd:true,message:`Tile Selection phase for round ${this.currentRound} has ended.`}
      }
      else {
        this.advanceToNextPlayer()
        return {roundEnd:false}
      }
    }

    gameState.advanceToNextPlayer = function() {
      this.currentPlayerIndex += 1
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0
      }
    }

    gameState.nextFirstPlayer = function() {
      var res = -1
      this.players.forEach( (e,i) => {
          if (e.discardLine.findIndex(t => t.first === true) >= 0) {
            res = i
          }
      })
      return res
    }

    gameState.performWallTiling = function() {
      var resultMessages = []

      this.players.forEach( (e,i) => {
          var res = e.performWallTiling(this)
          res.forEach( r => {
            if (r.row == "discard") {
              resultMessages.push(`Player ${i + 1} loses ${r.points*-1} points from discarded tiles.`)
            }
            else {
              resultMessages.push(`Player ${i + 1} gains ${r.points} points from placing ${r.color} tile in row ${r.row + 1}.`)
            }
          })

          for (var j =0; j < e.wallTiles.length; j++) {
            if (e.wallTiles[j].length >= e.wallPattern[j].length) {
              resultMessages.push(`Player ${i + 1} has completed row ${j + 1}.`)
            }
          }

      })
      return resultMessages
    }

    gameState.gameIsEnded = function() {
      var result = false
      for (var i=0; i < this.players.length; i++) {
        for (var j =0; j < this.players[i].wallTiles.length; j++) {
          if (this.players[i].wallTiles[j].length >= this.players[i].wallPattern[j].length) {
            result = true
            break
          }
        }
        if (result) {
          break
        }
      }
      return result
    }

    gameState.assignTilesToDisplay = function() {
        this.factoryDisplays.length = 0
        this.centerDisplay.length = 0
        for (var i=0; i< this.numberOfDisplays; i++) {
          var newDisplay = []
          while (newDisplay.length < 4 && (this.tileArray.length > 0 || this.discardedTiles.length > 0)) {
            if (this.tileArray.length == 0) {
              while (this.discardedTiles.length > 0) {
                this.tileArray.push(this.discardedTiles.pop())
              }
              shuffleArray(this.tileArray)
            }
            if (this.tileArray.length > 0) {
              newDisplay.push(this.tileArray.pop())
            }
          }
          sortTileArray(newDisplay)

          this.factoryDisplays.push(newDisplay)
        }
        let firstTile = new Object()
        firstTile.color = 'white'
        firstTile.first = true
        this.centerDisplay.push(firstTile)
    }

    gameState.calculateFinalBonusPoints = function() {
      var resultMessages = []

      this.players.forEach( (e,i) => {
          var res = e.addFinalBonusPoints()
          res.forEach( r => {
            if (r.type == 'horizontal') {
              resultMessages.push(`Player ${i + 1} gets ${r.points} points from completing row ${r.row + 1}.`)
            }
            else if (r.type == 'vertical') {
              resultMessages.push(`Player ${i + 1} gets ${r.points} points from completing column ${r.column + 1}.`)
            }
            else if (r.type == 'color') {
              resultMessages.push(`Player ${i + 1} gets ${r.points} points from completing the color ${r.color}.`)
            }
          })

      })
      return resultMessages
    }

    gameState.winningPlayers = function() {
      var winningPlayers = this.players.slice()
      winningPlayers.sort( (o1,o2) => {
        if (o1.score === o2.score) {
          return o2.numberOfCompletedRows() - o1.numberOfCompletedRows()
        }
        else {
          return o2.score - o1.score
        }
      })
      let topScore = winningPlayers[0].score
      let topPlayerRows = winningPlayers[0].numberOfCompletedRows()

      return winningPlayers.filter( e => {
        e.score == topScore && e.numberOfCompletedRows() == topPlayerRows
      })
    }

    return gameState
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
