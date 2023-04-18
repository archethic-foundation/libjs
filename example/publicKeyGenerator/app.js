import { Crypto, Utils } from 'archethic'

window.generatePublicKey = function() {
  let seed = document.querySelector("#seed").value;
  let index = parseInt(document.querySelector("#index").value);
  let curve = document.querySelector("#curve").value;

  if (seed == "" || Number.isNaN(index)) {
    return;
  }

  const { publicKey } = Crypto.deriveKeyPair(seed, index, curve);
  document.querySelector("#publicKey").innerText = Utils.uint8ArrayToHex(publicKey);
}
