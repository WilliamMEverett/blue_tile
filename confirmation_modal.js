const { ipcRenderer } = require('electron')

var passBackObject

function init() {
    ipcRenderer.on('configure_confirmation_modal', configure_confirmation_modal)

    document.getElementById('cancel_button').onclick = cancelPressed
    document.getElementById('accept_button').onclick = acceptPressed
}

function configure_confirmation_modal(event, arg) {
  document.getElementById('text_holder').textContent = arg.text
  if (arg.acceptText) {
      document.getElementById('accept_button').textContent = arg.acceptText
  }
  if (arg.cancelText) {
      document.getElementById('cancel_button').textContent = arg.cancelText
  }
  passBackObject = arg.passBackObject
}

function cancelPressed(event) {
  ipcRenderer.send('confirmation_modal_cancel', {passBackObject:passBackObject})
}

function acceptPressed(event) {
  ipcRenderer.send('confirmation_modal_accept', {passBackObject:passBackObject})
}


init()
