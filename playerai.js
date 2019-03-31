
module.exports = {
  getDefaultPlayerAI: _getDefaultPlayerAI,
  getAllAINames: _getAllAINames,
  getAINamed: _getAINamed
}

function _getDefaultPlayerAI() {
  return new PlayerAI()
}

function _getAllAINames() {
  return ["standard"]
}

function _getAINamed(name) {
  if (!name || name.length == 0) {
    return _getDefaultPlayerAI()
  }
  else if (name.toLowerCase() == 'standard') {
    return new PlayerAI()
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

  rankingFirstTilePenalty(player, gameState) {
    return -1
  }

  rankingDiscardPenalty(number, player, gameState) {
    return -2*number
  }

  rankingFinishRowBonus(rowIndex, player, gameState) {
    return 9 + player.patternRowSize[rowIndex]
  }

  rankingPlaceTilesInRowBonus(number, rowIndex, player, gameState) {
    return 2*number
  }

  rankingScoreForMove(player,move,gameState) {
    var score = 0

    if (move.row < player.patternRows.length) {
      var tilesOverflow = (move.tileDescriptor.tileNumber + player.patternRows[move.row].length) - player.patternRowSize[move.row]
      var tilesPlaced = move.tileDescriptor.tileNumber
      if (tilesOverflow > 0) {
        tilesPlaced -= tilesOverflow
        score += this.rankingDiscardPenalty(tilesOverflow, player, gameState)
      }
      score += this.rankingPlaceTilesInRowBonus(tilesPlaced, move.row, player, gameState)

      if (tilesOverflow >= 0) {
        score += this.rankingFinishRowBonus(move.row, player, gameState)
      }
    }
    else {
      score += this.rankingDiscardPenalty(move.tileDescriptor.tileNumber, player, gameState)
    }
    if (move.firstTile) {
      score += this.firstTilePenalty(player, gameState)
    }

    return score
  }


}
