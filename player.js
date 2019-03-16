
module.exports = {
  getDefaultPlayerObject: _getDefaultPlayerObject
}

function _getDefaultPlayerObject () {

    var newPlayer = new Object()
    newPlayer.playerNumber = -1
    newPlayer.score = 0
    newPlayer.patternRows = [[],[],[],[],[]]
    newPlayer.patternRowSize = [1,2,3,4,5]
    newPlayer.wallTiles = [[],[],[],[],[]]
    newPlayer.discardLine = []
    newPlayer.wallPattern = [['blue','red','green','black','yellow'],
    ['yellow','blue','red','green','black'],
    ['black','yellow','blue','red','green'],
    ['green','black','yellow','blue','red'],
    ['red','green','black','yellow','blue']]
    newPlayer.discardPenalties = [-1,-1,-2,-2,-2,-3,-3]

    newPlayer.wallRowContainsColor = function(color,row) {
      return this.wallTiles[row].reduce((accumulator, currentElement) => {
        if (accumulator == true) {
          return true
        }
        else {
          return currentElement.color == color
        }
      },false)
    }

    newPlayer.patternRowContainsOtherColor = function(color,row) {
      return this.patternRows[row].reduce((accumulator, currentElement) => {
        if (accumulator == true) {
          return true
        }
        else {
          return currentElement.color != color
        }
      },false)
    }

    newPlayer.canPlaceTileInPatternRow = function(tile,row) {
        if (this.patternRows[row].length >= this.patternRowSize[row]) {
          return false
        }
        if (this.wallRowContainsColor(tile.color,row)) {
          return false
        }
        if (this.patternRowContainsOtherColor(tile.color,row)) {
          return false
        }
    }

    newPlayer.placeTilesInPatternRow = function(tileDescriptor, rowIndex, center) {
      if (this.patternRows[rowIndex].length >= this.patternRowSize[rowIndex]) {
          return {success:false,message:"This row is already full."}
      }
      else if (this.patternRowContainsOtherColor(tileDescriptor.tiles[0].color, rowIndex)) {
          return {success:false,message:"You may only place tiles in a row that contains tiles of the same color."}
      }
      else if (this.wallRowContainsColor(tileDescriptor.tiles[0].color, rowIndex)) {
          return {success:false,message:"The wall tile in this row of that color has already been filled."}
      }

      var tookFirstTile = false
      var colorOfTile = tileDescriptor.tiles[0].color
      if (tileDescriptor.sourceArray == center) {
        var firstIndex = center.findIndex((e) => e.first === true)
        if (firstIndex >= 0) {
          tookFirstTile = true
          this.discardLine.push(center[firstIndex])
          center.splice(firstIndex,1)
        }
        tileDescriptor.tiles.forEach((e) => {
          var ind = center.indexOf(e)
          if (ind >= 0) {
            center.splice(ind,1)
          }
        })
      }
      else {
        var otherTiles = tileDescriptor.sourceArray.filter( (e) => e.color != colorOfTile)
        tileDescriptor.sourceArray.length = 0
        otherTiles.forEach((e) => center.push(e))
      }

      var discardLineTotal = 0
      tileDescriptor.tiles.forEach((e) => {
        if (this.patternRows[rowIndex].length < this.patternRowSize[rowIndex]) {
          this.patternRows[rowIndex].push(e)
        }
        else {
          discardLineTotal++
          this.discardLine.push(e)
        }
      })

      return {success:true,discard:discardLineTotal,firstTile:tookFirstTile}
    }

    return newPlayer
}
