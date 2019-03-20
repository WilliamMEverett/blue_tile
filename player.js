
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

    newPlayer.placeTilesInPatternRow = function(tileDescriptor, rowIndex, gameState) {
      if (rowIndex < this.patternRows.length) {
        if (this.patternRows[rowIndex].length >= this.patternRowSize[rowIndex]) {
          return {success:false}
        }
        else if (this.patternRowContainsOtherColor(tileDescriptor.tiles[0].color, rowIndex)) {
          return {success:false}
        }
        else if (this.wallRowContainsColor(tileDescriptor.tiles[0].color, rowIndex)) {
          return {success:false}
        }
      }

      var tookFirstTile = false
      var colorOfTile = tileDescriptor.tiles[0].color
      if (tileDescriptor.sourceArray == gameState.centerDisplay) {
        var firstIndex = gameState.centerDisplay.findIndex((e) => e.first === true)
        if (firstIndex >= 0) {
          tookFirstTile = true
          this.discardLine.push(gameState.centerDisplay[firstIndex])
          gameState.centerDisplay.splice(firstIndex,1)
        }
        tileDescriptor.tiles.forEach((e) => {
          var ind = gameState.centerDisplay.indexOf(e)
          if (ind >= 0) {
            gameState.centerDisplay.splice(ind,1)
          }
        })
      }
      else {
        var otherTiles = tileDescriptor.sourceArray.filter( (e) => e.color != colorOfTile)
        tileDescriptor.sourceArray.length = 0
        otherTiles.forEach((e) => gameState.centerDisplay.push(e))
      }

      var discardLineTotal = 0
      tileDescriptor.tiles.forEach((e) => {
        if (rowIndex < this.patternRows.length &&
           this.patternRows[rowIndex].length < this.patternRowSize[rowIndex]) {
          this.patternRows[rowIndex].push(e)
        }
        else {
          discardLineTotal++
          this.discardLine.push(e)
        }
      })

      return {success:true,discard:discardLineTotal,firstTile:tookFirstTile}
    }

    newPlayer.performWallTiling = function(gameState) {
      var results = []

      this.patternRows.forEach((e,i) => {
          if (e.length >= this.patternRowSize[i]) {
              var tile = e.pop()
              var points = this.pointsFromAddingWallTileAtRow(tile.color,i)
              this.score += points
              this.wallTiles[i].push(tile)
              while (e.length > 0) {
                gameState.discardedTiles.push(e.pop())
              }
              results.push({color:tile.color,row:i,points:points})
          }
      })

      var discardPoints = 0
      this.discardLine.forEach((e,i) => {
        if (i < this.discardPenalties.length) {
          discardPoints += this.discardPenalties[i]
        }
        if (e.first != true) {
          gameState.discardedTiles.push(e)
        }
      })
      this.discardLine.length = 0
      if (discardPoints != 0) {
        this.score += discardPoints
        results.push({points:discardPoints,row:"discard"})
      }

      return results
    }

    newPlayer.pointsFromAddingWallTileAtRow = function(color,row) {
        var colIndex = this.wallPattern[row].findIndex((e) => e == color)
        var points = 1
        var multipleHorizontal = false
        var multipleVertical = false
        //check horizontal row
        for (var i= colIndex - 1; i >= 0; i--) {
            if (!this.wallRowContainsColor(this.wallPattern[row][i], row)) {
                break
            }
            multipleHorizontal = true
            points += 1
        }
        for (var i = colIndex + 1; i < this.wallPattern[row].length; i++) {
            if (!this.wallRowContainsColor(this.wallPattern[row][i], row)) {
                break
            }
            multipleHorizontal = true
            points += 1
        }

        //check vertical column
        for (var i= row - 1; i >= 0; i--) {
            if (!this.wallRowContainsColor(this.wallPattern[i][colIndex],i)) {
                break
            }
            multipleVertical = true
            points += 1
        }
        for (var i = row + 1; i < this.wallPattern.length; i++) {
            if (!this.wallRowContainsColor(this.wallPattern[i][colIndex],i)) {
                break
            }
            multipleVertical = true
            points += 1
        }
        if (multipleVertical && multipleHorizontal) {
          points += 1
        }
        return points
    }

    newPlayer.addFinalBonusPoints = function() {
      var result = []
      var colorLookup = new Map()
      var columnLookup = new Map()
      this.wallTiles.forEach( (e,i) => {
          if (e.length >= this.wallPattern[i].length) {
            this.score += 2
            result.push({points:2,row:i,type:"horizontal"})
          }
          for (var j = 0; j < this.wallPattern[i].length; j++) {
            var color = this.wallPattern[i][j]
            if (this.wallRowContainsColor(color,i)) {
                var colorTotal = colorLookup.get(color)
                if (colorTotal == null) {
                  colorTotal = 0
                }
                colorTotal += 1
                colorLookup.set(color,colorTotal)
                var colTotal = columnLookup.get(j)
                if (colTotal == null) {
                  colTotal = 0
                }
                colTotal += 1
                columnLookup.set(j,colTotal)
            }
          }
      })
      columnLookup.forEach( (val,key) => {
          if (val >= this.wallPattern.length) {
            this.score += 7
            result.push({points:7,column:key,type:"vertical"})
          }
      })
      colorLookup.forEach( (val,key) => {
        if (val >= this.wallPattern[0].length) {
          this.score += 10
          result.push({points:10,color:key,type:"color"})
        }
      })

      return result
    }

    newPlayer.numberOfCompletedRows = function() {
      var result = 0
      this.wallTiles.forEach( (e,i) => {
        if (e.length >= this.wallPattern[i].length) {
          result += 1
        }
      })
      return result
    }

    return newPlayer
}
