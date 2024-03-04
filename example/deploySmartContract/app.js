import Archethic, { Crypto, Utils } from "@archethicjs/sdk"

document.getElementById("form").onsubmit = function() {
  return deploy(this)
}

function displayConfirmations(nbConf, maxConf) {
  const $confirmations = document.getElementById("confirmations");
  const alertClass = nbConf == maxConf ? "alert-success" : "alert-info";
  $confirmations.innerHTML = `<div class="alert ${alertClass}" role="alert">
                Confirmations: ${nbConf}/${maxConf}
            </div>`;
}

function displayError(reason) {
  const $confirmations = document.getElementById("confirmations");
  $confirmations.innerHTML = `<div class="alert alert-danger" role="alert">
                ${reason}
            </div>`;
}

function displayDetails(endpoint, genesisAddress, tx) {
  const $details = document.getElementById("details");
  const genesisHex = Utils.uint8ArrayToHex(genesisAddress);
  const addressHex = Utils.uint8ArrayToHex(tx.address);
  $details.innerHTML = `
                Genesis address: <a target=_blank href="${endpoint}/explorer/chain?address=${genesisHex}">${genesisHex}</a>
                <br />
                Transaction address: <a target=_blank href="${endpoint}/explorer/transaction/${addressHex}">${addressHex}</a>
            `;
}

function deploy(form) {
  const endpoint = document.getElementById("endpoint").value;
  const seed = document.getElementById("seed").value;
  const code = document.getElementById("code").value;

  if (!code || !seed || !endpoint) {
    return false;
  }

  const archethic = new Archethic(endpoint);

  archethic
    .connect()
    .then(async () => {
      console.log("CONNECTED");
      const genesisAddress = Crypto.deriveAddress(seed, 0);
      console.log("genesisAddress", genesisAddress);

      const tx = await createTransaction(archethic, genesisAddress, seed, code);
      console.log("tx", tx);
      displayDetails(endpoint, genesisAddress, tx);

      return tx
        .on("confirmation", (nbConf, maxConf) => displayConfirmations(nbConf, maxConf))
        .on("error", (_, err) => displayError(err))
        .on("timeout", (_) => displayError("timeout"))
        .send();
    })
    .catch((a) => {
      console.error(a);
    });

  return false;
}

async function createTransaction(archethic, genesisAddress, seed, code) {
  // get the storage nonce used to encode the seed
  const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
  console.log("storageNoncePublicKey", storageNoncePublicKey);

  const index = await archethic.transaction.getTransactionIndex(genesisAddress);
  console.log("index", index);

  // encrypt the seed with secretKey
  const secretKey = Crypto.randomSecretKey();
  const cipher = Crypto.aesEncrypt(seed, secretKey);

  // encrypt the secretKey with the storageNoncePublicKey so the nodes
  // can decode the secretKey that is used to decode the seed
  const authorizedKeys = [
    {
      publicKey: storageNoncePublicKey,
      encryptedSecretKey: Crypto.ecEncrypt(secretKey, storageNoncePublicKey)
    }
  ];

  const originPrivateKey = Utils.originPrivateKey;

  return archethic.transaction
    .new()
    .setType("contract")
    .setCode(code)
    .addOwnership(cipher, authorizedKeys)
    .build(seed, parseInt(index))
    .originSign(originPrivateKey);
}
