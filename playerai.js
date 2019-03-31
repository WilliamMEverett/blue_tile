
module.exports = {
  getDefaultPlayerAI: _getDefaultPlayerAI,
  getAllAINames: _getAllAINames,
  getAINamed: _getAINamed
}

function _getDefaultPlayerAI() {
  return new PlayerAI()
}

function _getAllAINames() {
  return ["standard","random","colors"]
}

function _getAINamed(name) {
  if (!name || name.length == 0) {
    return _getDefaultPlayerAI()
  }
  else if (name.toLowerCase() == 'standard') {
    return new PlayerAI()
  }
  else if (name.toLowerCase() == 'random') {
    return new RandomPlayerAI()
  }
  else if (name.toLowerCase() == 'colors') {
    return new ColorsPlayerAI()
  }
  else {
    return null
  }
}

class PlayerAI {
  constructor() {
    this.difficulty = 0
    this.randomness = 0
  }

  getName() {
    return "Standard"
  }

  moveForGamestate(player,gameState) {

    var movesToCheck = this.rankedMoves(this.allPossibleNonDiscardMoves(gameState,player),player,gameState)
    if (movesToCheck.length == 0) {
      movesToCheck = this.rankedMoves(this.allPossibleDiscardMoves(gameState,player),player,gameState)
    }
    if (movesToCheck.length == 0) {
      return null
    }

    var topScore = Number.MIN_SAFE_INTEGER
    movesToCheck.forEach( e => {
      if (e.score > topScore) {
        topScore = e.score
      }
    })

    var topMoves = movesToCheck.filter( e => e.score === topScore)
    if (topMoves.length == 1) {
      return topMoves[0]
    }
    else {
      return topMoves[Math.floor(Math.random() * topMoves.length)]
    }

  }

  rankedMoves(moves,player,gameState) {
    var ranked = []
    moves.forEach( e => {
      var res = {score:this.rankingScoreForMove(player,e,gameState)}
      ranked.push(Object.assign(res,e))
    })
    return ranked
  }

  allPossibleNonDiscardMoves(gameState,player) {

    var moves = []
    var tileSelections = gameState.getAllTileSelectionChoices()

    tileSelections.forEach( (td) => {
      for (var i=0; i < player.patternRows.length; i++) {
        if (player.canPlaceTileInPatternRow({color:td.tileColor},i)) {
          moves.push({row:i,tileDescriptor:td})
        }
      }
    })
    return moves
  }

  allPossibleDiscardMoves(gameState, player) {

    var moves = []
    var tileSelections = gameState.getAllTileSelectionChoices()

    tileSelections.forEach( (td) => {
        moves.push({row:player.patternRows.length,tileDescriptor:td})
      })
    return moves
  }

  rankingFirstTilePenalty(player, gameState, move) {
    return -1
  }

  rankingDiscardPenalty(number, player, gameState, move) {
    return -2*number
  }

  rankingFinishRowBonus(rowIndex, player, gameState, move) {
    return 9 + player.patternRowSize[rowIndex]
  }

  rankingPlaceTilesInRowBonus(number, rowIndex, player, gameState, move) {
    return 2*number
  }

  rankingScoreForMove(player,move,gameState) {
    var score = 0

    if (move.row < player.patternRows.length) {
      var tilesOverflow = (move.tileDescriptor.tileNumber + player.patternRows[move.row].length) - player.patternRowSize[move.row]
      var tilesPlaced = move.tileDescriptor.tileNumber
      if (tilesOverflow > 0) {
        tilesPlaced -= tilesOverflow
        score += this.rankingDiscardPenalty(tilesOverflow, player, gameState, move)
      }
      score += this.rankingPlaceTilesInRowBonus(tilesPlaced, move.row, player, gameState, move)

      if (tilesOverflow >= 0) {
        score += this.rankingFinishRowBonus(move.row, player, gameState, move)
      }
    }
    else {
      score += this.rankingDiscardPenalty(move.tileDescriptor.tileNumber, player, gameState, move)
    }
    if (move.firstTile) {
      score += this.firstTilePenalty(player, gameState, move)
    }

    return score
  }

}

class RandomPlayerAI extends PlayerAI {
  getName() {
    return "Random"
  }

  moveForGamestate(player,gameState) {

    var movesToCheck = this.rankedMoves(this.allPossibleNonDiscardMoves(gameState,player),player,gameState)
    if (movesToCheck.length == 0) {
      movesToCheck = this.rankedMoves(this.allPossibleDiscardMoves(gameState,player),player,gameState)
    }
    if (movesToCheck.length == 0) {
      return null
    }

    var topScore = Number.MIN_SAFE_INTEGER
    movesToCheck.forEach( e => {
      if (e.score > topScore) {
        topScore = e.score
      }
    })

    var topMoves = movesToCheck.filter( e => e.score >= (topScore - 3))
    if (topMoves.length == 1) {
      return topMoves[0]
    }
    else {
      return topMoves[Math.floor(Math.random() * topMoves.length)]
    }

  }

  rankingFinishRowBonus(rowIndex, player, gameState, move) {
    return 2
  }

  rankingPlaceTilesInRowBonus(number, rowIndex, player, gameState, move) {
    return 1*number
  }

  rankingFirstTilePenalty(player, gameState, move) {
    return 0
  }

}

class ColorsPlayerAI extends PlayerAI {

  getName() {
    return "Colors"
  }

  rankingFinishRowBonus(rowIndex, player, gameState, move) {

    //must finish up partly completed row so we can clear it out and put other color in
    if (player.patternRows[rowIndex].length > 0) {
        return 15 + player.patternRowSize[rowIndex]
    }

    var playerCopy = player.deepCopy()
    playerCopy.performWallTiling({discardedTiles:[]})

    var numberOfSameColor = playerCopy.wallTiles.reduce((accumulator, currentValue, index) => {
        if (playerCopy.wallRowContainsColor(move.tileDescriptor.tileColor, index)) {
          return accumulator + 1
        }
        else {
          return accumulator
        }

    },0)

    return 2 + numberOfSameColor*4
  }

  rankingPlaceTilesInRowBonus(number, rowIndex, player, gameState, move) {

    var playerCopy = player.deepCopy()
    playerCopy.performWallTiling({discardedTiles:[]})

    var numberOfSameColor = playerCopy.wallTiles.reduce((accumulator, currentValue, index) => {
        if (playerCopy.wallRowContainsColor(move.tileDescriptor.tileColor, index)) {
          return accumulator + 1
        }
        else {
          return accumulator
        }

    },0)

    if (player.patternRows[rowIndex].length == 0 && numberOfSameColor == 0) {
        return -10
    }

    return (1 + numberOfSameColor)*number
  }

}
