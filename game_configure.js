const { ipcRenderer } = require('electron')

var gameConfiguration = new Object()
gameConfiguration.players = []


function init() {
    ipcRenderer.on('configure_game_start_mode', configure_game_start_mode)

    document.getElementById('cancel_button').onclick = cancelPressed
    document.getElementById('start_button').onclick = startPressed

    let nl2 = document.querySelectorAll('select')
    nl2.forEach( (element) => {
        element.onchange = changeEventHandler
    })
}

function configure_game_start_mode(event, args) {
  gameConfiguration = args.gameConfiguration
  setupUI(gameConfiguration)
}

function setupUI(gameC) {
    let nl2 = document.querySelectorAll('.player_configure_row')
    nl2.forEach( (e,i) => {
      if (i <= gameC.players.length) {
        e.hidden = false
        var pType = e.querySelector('.player_type')
        while (pType.hasChildNodes()) {
          pType.removeChild(pType.firstChild)
        }
        let firstChoice = document.createElement('option')
        firstChoice.setAttribute('value','human')
        firstChoice.appendChild(document.createTextNode('Human'))
        pType.appendChild(firstChoice)

        let secondChoice = document.createElement('option')
        secondChoice.setAttribute('value','computer')
        secondChoice.appendChild(document.createTextNode('Computer'))
        pType.appendChild(secondChoice)

        if (i > 0 && (i >= gameC.players.length - 1)) {
          let thirdChoice = document.createElement('option')
          thirdChoice.setAttribute('value','none')
          thirdChoice.appendChild(document.createTextNode('None'))
          pType.appendChild(thirdChoice)
        }

        var expectedValue = 'none'
        if ( i < gameC.players.length && gameC.players[i].type) {
          expectedValue = gameC.players.type
        }
        for (var j=0; j < pType.options.length; j++) {
          if (pType.options[j].value == expectedValue) {
            pType.options[j].selected = true
          }
        }

        var aiType = e.querySelector('.player_ai')
        while (aiType.hasChildNodes()) {
          aiType.removeChild(aiType.firstChild)
        }

        if ( i >= gameC.players.length || gameC.players[i].type != 'computer') {
          aiType.hidden = true
          return
        }
        aiType.hidden = false

        gameC.aiChoices.forEach( m => {
          let aIChoice = document.createElement('option')
          aIChoice.setAttribute('value',m)
          aIChoice.appendChild(document.createTextNode(m.charAt(0).toUpperCase() + m.slice(1)))
          aiType.appendChild(aIChoice)
        })

        expectedValue = gameC.players[i].aiType
        for (var j=0; j < aiType.options.length; j++) {
          if (aiType.options[j].value == expectedValue) {
            aiType.options[j].selected = true
          }
        }
      }
      else {
        e.hidden = true
      }
    })
}

function changeEventHandler(event) {
  let nl2 = document.querySelectorAll('.player_configure_row')
  var row = -1
  var value = ''
  var field = null
  nl2.forEach( (e,i) => {
    if (e.contains(event.currentTarget)) {
      row = i
      if (event.currentTarget.className.match(/\bplayer_type\b/i)) {
          field = 'type'
      }
      else if (event.currentTarget.className.match(/\bplayer_ai\b/i)) {
          field = 'aiType'
      }
      value = event.currentTarget.value
    }
  })
  if (row >= 0) {
    if (row >= gameConfiguration.players.length) {
        if (field == 'type' && value != 'none') {
          gameConfiguration.players.push({type:value, aiType: gameConfiguration.aiChoices[0]})
        }
    }
    else if (field == 'type' && value == 'none') {
      if (row > 0 && row == gameConfiguration.players.length - 1) {
        gameConfiguration.pop()
      }
    }
    else {
      if (field == 'type') {
        gameConfiguration.players[row].type = value
      }
      else if (field == 'aiType') {
        gameConfiguration.players[row].aiType = value
      }
    }
  }
  setupUI(gameConfiguration)
}

function cancelPressed(event) {
  ipcRenderer.send('game_start_cancel', {gameConfiguration:gameConfiguration})
}

function startPressed(event) {
  ipcRenderer.send('game_start_confirm', {gameConfiguration:gameConfiguration})
}

init()
