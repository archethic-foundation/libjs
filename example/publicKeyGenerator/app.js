import { Utils, Crypto } from '../../index.js'


window.generatePublicKey = function () {
  seed = document.querySelector("#seed").value;
  index = parseInt(document.querySelector("#index").value);
  curve = document.querySelector("#curve").value;

  if (seed == "" || Number.isNaN(index)) {
    return;
  }

  const { publicKey } = Crypto.deriveKeyPair(seed, index, curve);
  document.querySelector("#publicKey").innerText = Utils.uint8ArrayToHex(publicKey);
}
