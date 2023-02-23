
import { Utils, Crypto } from '../../index.js'

window.generateAddress = function () {
  seed = document.querySelector("#seed").value
  index = parseInt(document.querySelector("#index").value)
  curve = document.querySelector("#curve").value
  hash = document.querySelector("#hash").value

  if (seed == "" || Number.isNaN(index)) {
    return
  }
  address = Crypto.deriveAddress(seed, index, curve, hash)
  document.querySelector("#address").innerText = Utils.uint8ArrayToHex(address)
}

