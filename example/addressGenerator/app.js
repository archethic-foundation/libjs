import { Utils, Crypto } from '@archethicjs/sdk'

window.generateAddress = function() {
  let seed = document.querySelector("#seed").value
  let index = parseInt(document.querySelector("#index").value)
  let curve = document.querySelector("#curve").value
  let hash = document.querySelector("#hash").value

  if (seed == "" || Number.isNaN(index)) {
      return
  }
  let address = Crypto.deriveAddress(seed,index,curve,hash)
  document.querySelector("#address").innerText = Utils.uint8ArrayToHex(address)
}

