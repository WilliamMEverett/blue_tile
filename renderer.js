const { ipcRenderer } = require('electron')

function init() {

  ipcRenderer.on('configure_tile_displays', configure_tile_displays)
  ipcRenderer.on('highlight_tiles_in_display', highlight_tiles_in_display)
  ipcRenderer.on('highlight_pattern_rows', highlight_pattern_rows)
  ipcRenderer.on('configure_player', configure_player)
  ipcRenderer.on('select_player', select_player)
  ipcRenderer.on('set_number_factory_displays', set_number_factory_displays)
  ipcRenderer.on('set_number_players', set_number_players)
  ipcRenderer.on('set_player_description', set_player_description)
  ipcRenderer.on('log_message', log_message)
  ipcRenderer.on('main_message', main_message)
  ipcRenderer.on('temporary_message', temporary_message)
  ipcRenderer.send('renderer_initialized', true)

  let nl = document.querySelectorAll('.factory_display_slot')
  nl.forEach( (element) => {
      element.onclick = factory_slot_clicked
  })

  let nl2 = document.querySelectorAll('.pattern_row')
  nl2.forEach( (element) => {
      element.onclick = pattern_row_clicked
  })
  let nl3 = document.querySelectorAll('.player_discard')
  nl3.forEach( (element) => {
      element.onclick = pattern_row_clicked
  })
}

function configure_tile_displays(event, arg) {
    var selectedDisplay = null
    if (arg.index == "center") {
      selectedDisplay = document.getElementById('factory_display_center')
    }
    else if (arg.index != null && !Number.isNaN(arg.index)) {
      let nl = document.getElementById('factory_display_table').querySelectorAll('.factory_display')
      let arrFromList = Array.prototype.slice.call(nl);
      if (arg.index < arrFromList.length) {
        selectedDisplay = arrFromList[arg.index]
      }
    }

    if (!selectedDisplay) {
      return
    }

    let nl = selectedDisplay.querySelectorAll('.factory_display_slot')
    let arrFromList = Array.prototype.slice.call(nl);
    for (var i=0; i < arrFromList.length; i++) {
      let slot = arrFromList[i]
      while (slot.firstChild) {
        slot.removeChild(slot.firstChild);
      }
      slot.style.backgroundColor = null
      slot.style.outline = null

      if (i < arg.tiles.length) {
        slot.style.backgroundColor = arg.tiles[i].color
        if (arg.tiles[i].first) {
          let firstTile = document.createTextNode('1')
          slot.appendChild(firstTile)
        }
      }
    }
}

function highlight_tiles_in_display(event, arg) {
  var selectedDisplay = null
  if (arg.index == "center") {
    selectedDisplay = document.getElementById('factory_display_center')
  }
  else if (arg.index != null && !Number.isNaN(arg.index)) {
    let nl = document.getElementById('factory_display_table').querySelectorAll('.factory_display')
    let arrFromList = Array.prototype.slice.call(nl);
    if (arg.index < arrFromList.length) {
      selectedDisplay = arrFromList[arg.index]
    }
  }

  if (!selectedDisplay) {
    return
  }

  let nl = selectedDisplay.querySelectorAll('.factory_display_slot')
  let arrFromList = Array.prototype.slice.call(nl);
  for (var i=0; i < arrFromList.length; i++) {
    let slot = arrFromList[i]
    if (slot.style.backgroundColor && slot.style.backgroundColor == arg.color) {
      slot.style.outline = 'solid gold 2px'
    }
    else {
      slot.style.outline = null
    }
  }
}

function highlight_pattern_rows(event, arg) {
  let playerBoardsElement = document.getElementById('playerBoards')
  let playerBoardNodes = playerBoardsElement.querySelectorAll('.player_board')
  if (arg.player >= playerBoardNodes.length) {
    return
  }
  var playerPanel = playerBoardNodes.item(arg.player)

  var patternRows = playerPanel.querySelector('.player_pattern_rows').querySelectorAll('.pattern_row')
  patternRows.forEach((e,i) => {

    if (arg.rows && (arg.rows.findIndex(e => e == i) >= 0)) {
        e.style.outline = "solid #80FF80 1px"
    }
    else {
        e.style.outline = null
    }
  })

  var overflowDisplay = playerPanel.querySelector('.player_discard')
  if (arg.rows && (arg.rows.findIndex(e => e >= patternRows.length) >= 0)) {
      overflowDisplay.style.outline = "solid #80FF80 1px"
  }
  else {
      overflowDisplay.style.outline = null
  }

}

function configure_player(event, arg) {
  let playerBoardsElement = document.getElementById('playerBoards')
  let playerBoardNodes = playerBoardsElement.querySelectorAll('.player_board')
  if (arg.index >= playerBoardNodes.length) {
    return
  }
  var playerScorePanel = playerBoardNodes.item(arg.index).querySelector('.player_score_panel')
  while (playerScorePanel.firstChild) {
    playerScorePanel.removeChild(playerScorePanel.firstChild);
  }
  playerScorePanel.appendChild(document.createTextNode("" + arg.player.score + " points"))

  var patternRows = playerBoardNodes.item(arg.index).querySelector('.player_pattern_rows')
  let rowsArray = Array.prototype.slice.call(patternRows.querySelectorAll('.pattern_row'))
  for (var i=0; i < rowsArray.length; i++) {
    rowsArray[i].style.outline = null
    var cellsArray = Array.prototype.slice.call(rowsArray[i].querySelectorAll('.player_pattern_slot'))
    for (var j=0; j< cellsArray.length; j++) {
      var color = 'white'
      if (j < arg.player.patternRows[i].length ) {
        color = arg.player.patternRows[i][j].color
      }
      cellsArray[cellsArray.length - j - 1].style.backgroundColor = color
    }
  }

  var wallRows = playerBoardNodes.item(arg.index).querySelector('.player_wall_rows')
  let wallRowsArray = Array.prototype.slice.call(wallRows.querySelectorAll('.wall_row'))
  for (var i=0; i < wallRowsArray.length; i++) {
    var cellsArray = Array.prototype.slice.call(wallRowsArray[i].querySelectorAll('.player_wall_slot_border'))
    for (var j=0; j < cellsArray.length; j++) {
      var cellColor = arg.player.wallPattern[i][j]
      cellsArray[j].style.backgroundColor = cellColor
      var fillColor = 'white'
      if (arg.player.wallTiles[i].find((element) => element.color == cellColor) != null) {
        fillColor = cellColor
      }
      cellsArray[j].querySelector('.player_wall_slot').style.backgroundColor = fillColor
    }
  }

  var overflowDisplay = playerBoardNodes.item(arg.index).querySelector('.player_discard')
  overflowDisplay.style.outline = null
  let overflowHeaders = Array.prototype.slice.call(overflowDisplay.querySelectorAll('.player_discard_penalty'))
  overflowHeaders.forEach((e,i) => {
    if (e.textContent.trim().length > 0) {
      return
    }
    if (arg.player.discardPenalties.length > i) {
      var text = document.createTextNode("" + arg.player.discardPenalties[i])
      e.appendChild(text)
    }
  })

  let discardSlots = Array.prototype.slice.call(overflowDisplay.querySelectorAll('.player_discard_slot'))
  discardSlots.forEach((e,i) => {
    while (e.firstChild) {
      e.removeChild(e.firstChild);
    }
    if (arg.player.discardLine.length > i) {
      e.style.backgroundColor = arg.player.discardLine[i].color

      if (arg.player.discardLine[i].first) {
        let firstTile = document.createTextNode('1')
        e.appendChild(firstTile)
      }
    }
    else {
      e.style.backgroundColor = 'white'
    }
  })

}

function select_player(event, arg) {
    let playerBoardsElement = document.getElementById('playerBoards')
    let playerBoardNodes = playerBoardsElement.querySelectorAll('.player_board')
    playerBoardNodes.forEach( (e,i) => {
        if (arg.index == i) {
            e.style.outline = 'solid gold 3px'
            e.style.opacity = null
        }
        else {
            if (arg.index >= 0) {
              e.style.opacity = 0.7
            }
            else {
              e.style.opacity = null
            }
            e.style.outline = null
        }
    })
}

function set_number_factory_displays(event, arg) {
  var factoryDisplayNodes = document.getElementById('factory_display_table').querySelectorAll('.factory_display');
  factoryDisplayNodes.forEach((e,i) => {
    if (i < arg) {
      e.hidden = false
    }
    else {
      e.hidden = true
    }
  })
}

function set_number_players(event, arg) {
  var playerNodes = document.getElementById('playerBoards').querySelectorAll('.player_board');
  playerNodes.forEach((e,i) => {
    if (i < arg) {
      e.hidden = false
    }
    else {
      e.hidden = true
    }
  })
}

function set_player_description(event, arg) {
  var playerIndex = arg.index
  var playerDescription = arg.description
  var playerNodes = document.getElementById('playerBoards').querySelectorAll('.player_board');
  if (playerIndex < 0 || playerIndex >= playerNodes.length) {
    return
  }
  var descriptionDiv = playerNodes.item(playerIndex).querySelector('.player_description_panel')
  descriptionDiv.textContent = playerDescription

}

function log_message(event, arg) {
  var logPanel = document.getElementById('logPanel');

  let currentDate = new Date()

  let dateString = currentDate.getHours().toString().padStart(2,"0") + ":" +
  currentDate.getMinutes().toString().padStart(2,"0") + ":" +
  currentDate.getSeconds().toString().padStart(2,"0")

  var text = document.createTextNode("[" + dateString + "] " + arg)
  logPanel.appendChild(text)

  logPanel.appendChild(document.createElement('br'))
  logPanel.scrollTop = logPanel.scrollHeight - logPanel.clientHeight;
}

function main_message(event, arg) {
  var messagePanel = document.getElementById('mainMessagePanel');
  while (messagePanel.firstChild) {
    messagePanel.removeChild(messagePanel.firstChild);
  }
  var text = document.createTextNode(arg)
  messagePanel.appendChild(text)
}

function temporary_message(event, arg) {
  var messagePanel = document.getElementById('temporaryMessagePanel');
  while (messagePanel.firstChild) {
    messagePanel.removeChild(messagePanel.firstChild);
  }
  var message = arg.message
  var color = arg.color
  if (color == null) {
    messagePanel.style.color = 'black'
  }
  else {
    messagePanel.style.color = color
  }

  var text = document.createTextNode(message)
  messagePanel.appendChild(text)
  setTimeout(function () {
    if (text.parentNode) {
      text.parentNode.removeChild(text)
    }
  }, 5000)
}

function factory_slot_clicked(event) {
  var containingTD = event.currentTarget.parentNode
  var containingDisplay = containingTD.parentNode.parentNode.parentNode
  let nl = document.getElementById('factory_display_table').querySelectorAll('.factory_display')
  let arrFromList = Array.prototype.slice.call(nl);
  var displayIndex = null;
  for (var i=0; i < arrFromList.length; i++) {
    if (arrFromList[i].contains(event.currentTarget)) {
      displayIndex = i
      break
    }
  }
  if (displayIndex == null) {
    displayIndex = "center"
  }
  let nl2 = containingDisplay.querySelectorAll('.factory_display_slot')
  let slotArray = Array.prototype.slice.call(nl2);
  var slotIndex = -1;
  for (var i=0; i < slotArray.length; i++) {
    if (event.currentTarget == slotArray[i]) {
      slotIndex = i
      break
    }
  }

  ipcRenderer.send('tile_slot_clicked', {display:displayIndex,slot:slotIndex})
}

function pattern_row_clicked(event) {
  var playerBoardNodes = document.querySelectorAll('.player_board')
  var playerIndex = -1;
  for (var j=0; j < playerBoardNodes.length; j++) {
    if (!playerBoardNodes.item(j).contains(event.currentTarget)) {
      continue
    }
    playerIndex = j
    if (event.currentTarget.className.match(/\bplayer_discard\b/i)) {
      rowIndex = 5
      break
    }

    let nl2 = playerBoardNodes.item(j).querySelectorAll('.pattern_row')
    let rowArray = Array.prototype.slice.call(nl2);
    var rowIndex = -1;
    for (var i=0; i < rowArray.length; i++) {
      if (event.currentTarget == rowArray[i]) {
        rowIndex = i
        break
      }
    }
    break
  }

  ipcRenderer.send('pattern_row_clicked', {row:rowIndex,player:playerIndex})
}

init();
