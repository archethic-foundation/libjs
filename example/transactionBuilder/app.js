import Archethic, { Utils, Crypto } from '../../index.js'


const { toBigInt } = Utils;

let file_content = "";

let transaction;
let ucoTransfers = [];
let tokenTransfers = [];
let recipients = [];
let ownerships = [];

let endpoint = document.querySelector("#endpoint").value;

let archethic = new Archethic(endpoint);
archethic.connect();

document
  .querySelector("#endpoint")
  .addEventListener("change", async function () {
    archethic = new Archethic(this.value);
    archethic.connect();
  });

window.generate_transaction = async () => {
  transaction = null;
  document.querySelector("#transactionOutput").style.visibility = "hidden";

  const seed = document.querySelector("#seed").value;
  const index = document.querySelector("#index").value;
  const curve = document.querySelector("#curve").value;
  const endpoint = document.querySelector("#endpoint").value;
  const originPrivateKey = Utils.originPrivateKey;

  const code = document.querySelector("#code").value;
  if (code != "") {
    const ownershipIndex = ownerships.findIndex(function (ownership) {
      return ownership.secret == seed;
    });
    if (ownershipIndex == -1) {
      alert(
        "You need to create an ownership with the transaction seed as secret and authorize node public key to let nodes generate new transaction from your smart contract"
      );
      return;
    }

    const publicKey = await archethic.network.getStorageNoncePublicKey();
    const authorizedKeyIndex = ownerships[
      ownershipIndex
    ].authorizedKeys.findIndex(function (authKey) {
      return authKey.publicKey == publicKey;
    });

    if (authorizedKeyIndex == -1) {
      alert(
        "You need to create an ownership with the transaction seed as secret and authorize node public key to let nodes generate new transaction from your smart contract"
      );
      return;
    }
  }

  let content = document.querySelector("#content").value;
  if (file_content != "") {
    content = file_content;
  }

  txBuilder = archethic.transaction
    .new()
    .setType(document.querySelector("#type").value)
    .setCode(document.querySelector("#code").value)
    .setContent(content);

  ownerships.forEach(function (ownership) {
    const secretKey = Crypto.randomSecretKey();
    const cipher = Crypto.aesEncrypt(ownership.secret, secretKey);

    const authorizedKeys = ownership.authorizedKeys.map(function (authKey) {
      encryptedSecretKey = Crypto.ecEncrypt(secretKey, authKey.publicKey);
      return {
        publicKey: authKey.publicKey,
        encryptedSecretKey: encryptedSecretKey,
      };
    });

    txBuilder.addOwnership(cipher, authorizedKeys);
  });

  ucoTransfers.forEach(function (transfer) {
    txBuilder.addUCOTransfer(transfer.to, transfer.amount);
  });

  tokenTransfers.forEach(function (transfer) {
    txBuilder.addTokenTransfer(
      transfer.to,
      transfer.amount,
      transfer.token,
      transfer.tokenId
    );
  });

  recipients.forEach(function (recipient) {
    txBuilder.addRecipient(recipient);
  });

  transaction = txBuilder
    .build(seed, parseInt(index), curve)
    .originSign(originPrivateKey);

  document.querySelector("#transactionOutput #address").innerText =
    Utils.uint8ArrayToHex(transaction.address);
  document.querySelector("#transactionOutput").style.visibility = "visible";
  const result = await archethic.transaction.getTransactionFee(transaction);
  document.querySelector("#tx_fee").innerText = `
    ${Utils.fromBigInt(result.fee)} UCO ($${result.rates.usd})`;
};

window.onClickAddStorageNoncePublicKey = async () => {
  const endpoint = document.querySelector("#endpoint").value;
  const storageNonce = await archethic.network.getStorageNoncePublicKey();
  const option = document.createElement("option");
  option.text = storage_nonce;
  option.value = storage_nonce;
  const select = document.querySelector("#authorized_public_keys");
  select.appendChild(option);
};

window.onClickAddTransfer = () => {
  const transfer_to = document.querySelector("#amount_address").value;
  const transferAmount = document.querySelector("#uco_amount").value;

  const amount = parseFloat(transferAmount);
  if (transferAmount == "" || Number.isNaN(amount) || amount < 0.0) {
    return;
  }

  if (transfer_to == "") {
    return;
  }

  ucoTransfers.push({ to: transfer_to, amount: toBigInt(amount) });

  const option = document.createElement("option");
  option.text = transfer_to + ": " + transferAmount;
  option.value = transfer_to + ":" + transferAmount;
  const select = document.querySelector("#uco_transfers");
  select.appendChild(option);

  select.size += 1;

  document.querySelector("#amount_address").value = "";
  document.querySelector("#uco_amount").value = "";
};

window.onClickAddTokenTransfer = async () => {
  const transfer_to = document.querySelector("#token_recipient_address").value;
  const transferAmount = document.querySelector("#token_amount").value;
  const transferToken = document.querySelector("#token_address").value;
  const transferTokenId = document.querySelector("#token_id").value;

  const amount = parseFloat(transferAmount);
  if (transferAmount == "" || Number.isNaN(amount) || amount < 0.0) {
    return;
  }

  if (transfer_to == "") {
    return;
  }

  if (transferToken == "") {
    return;
  }

  const { decimals } = await archethic.network
    .getToken(transferToken)
    .catch(() => {
      return { decimals: 8 };
    });

  tokenTransfers.push({
    to: transfer_to,
    amount: toBigInt(amount, decimals),
    token: transferToken,
    tokenId: parseInt(transferTokenId),
  });

  const option = document.createElement("option");
  option.text =
    transfer_to.substring(0, 10) +
    ": " +
    transferAmount +
    ": " +
    transferToken.substring(0, 10) +
    ":" +
    transferTokenId;
  option.value = transfer_to + ":" + transferAmount + ":" + transferToken;
  const select = document.querySelector("#token_transfers");
  select.appendChild(option);

  select.size += 1;

  document.querySelector("#token_recipient_address").value = "";
  document.querySelector("#token_amount").value = "";
  document.querySelector("#token_address").value = "";
  document.querySelector("#token_id").value = "0";
};

window.onClickAddRecipient = () => {
  const recipient = document.querySelector("#recipient").value;
  recipients.push(recipient);

  const option = document.createElement("option");
  option.text = recipient;
  option.value = recipient;
  var select = document.querySelector("#recipients");
  select.appendChild(option);

  select.size += 1;

  document.querySelector("#recipient").value = "";
};

window.sendTransaction = async () => {
  const endpoint = document.querySelector("#endpoint").value;
  document.querySelector("#confirmations").innerText = 0;

  transaction
    .on("confirmation", (nbConfirmations, maxConfirmations) => {
      document.querySelector("#transaction_error").style.display = "none";
      document.querySelector("#confirmed").style.display = "block";
      document.querySelector("#confirmations").innerText = nbConfirmations;
      document.querySelector("#maxConfirmations").innerText = maxConfirmations;
    })
    .on("error", (context, reason) => {
      document.querySelector("#confirmed").style.display = "none";
      document.querySelector("#transaction_error").style.display = "block";
      document.querySelector("#error_reason").innerText = reason;
    })
    .on("sent", () => {
      document.querySelector("#success").style.display = "block";
      document.querySelector("#tx_address_link").innerText =
        endpoint +
        "/explorer/transaction/" +
        Utils.uint8ArrayToHex(transaction.address);
      document
        .querySelector("#tx_address_link")
        .setAttribute(
          "href",
          endpoint +
          "/explorer/transaction/" +
          Utils.uint8ArrayToHex(transaction.address)
        );
    })
    .send();
};

window.getTransactionIndex = async () => {
  const seed = document.querySelector("#seed").value;
  const curve = document.querySelector("#curve").value;

  const address = Crypto.deriveAddress(seed, 0, curve);
  const nb = await archethic.transaction.getTransactionIndex(address);
  document.querySelector("#index").value = nb;
};

document
  .querySelector("#content_upload")
  .addEventListener("change", (event) => {
    const fileList = event.target.files;

    const fr = new FileReader();
    fr.onload = function (e) {
      file_content = new Uint8Array(e.target.result);
    };
    fr.readAsArrayBuffer(fileList[0]);
  });

window.addOwnership = () => {
  const ownershipIndex = ownerships.length;

  const ownershipEl = document.createElement("div");

  const secretInputLabel = document.createElement("label");
  secretInputLabel.innerText = "Enter the secret";
  secretInputLabel.setAttribute("for", "secret_" + ownershipIndex);

  const secretInput = document.createElement("input");
  secretInput.setAttribute("type", "password");
  secretInput.setAttribute("id", "secret_" + ownershipIndex);
  secretInput.setAttribute("placeholder", "Secret to host");
  secretInput.setAttribute("class", "input");
  secretInput.addEventListener("change", function (e) {
    ownerships[ownershipIndex] = { secret: e.target.value, authorizedKeys: [] };
  });

  ownershipEl.appendChild(document.createElement("hr"));
  ownershipEl.appendChild(secretInputLabel);
  ownershipEl.appendChild(secretInput);
  ownershipEl.appendChild(document.createElement("br"));
  ownershipEl.appendChild(document.createElement("br"));

  const authorizedPublicKeyLabel = document.createElement("label");
  authorizedPublicKeyLabel.setAttribute(
    "for",
    "authPublicKey_" + ownershipIndex
  );

  const authorizedPublicKeyInput = document.createElement("input");
  authorizedPublicKeyInput.setAttribute("type", "text");
  authorizedPublicKeyInput.setAttribute(
    "id",
    "authPublicKey_" + ownershipIndex
  );
  authorizedPublicKeyInput.setAttribute(
    "placeholder",
    "Enter the public key to authorize"
  );
  authorizedPublicKeyInput.setAttribute("class", "input");

  const authorizedPublicKeyButtonAdd = document.createElement("button");
  authorizedPublicKeyButtonAdd.setAttribute("class", "button");
  authorizedPublicKeyButtonAdd.setAttribute("type", "button");
  authorizedPublicKeyButtonAdd.innerText = "Add public key";
  authorizedPublicKeyButtonAdd.addEventListener("click", function () {
    addPublicKey(ownershipIndex);
  });

  const storageNoncePublicKeyButtonAdd = document.createElement("button");
  storageNoncePublicKeyButtonAdd.setAttribute("class", "button");
  storageNoncePublicKeyButtonAdd.setAttribute("type", "button");
  storageNoncePublicKeyButtonAdd.innerText = "Load storage nonce public key";
  storageNoncePublicKeyButtonAdd.addEventListener("click", function () {
    loadStorageNoncePublicKey(ownershipIndex);
  });

  const publicKeyList = document.createElement("select");
  publicKeyList.setAttribute("multiple", "true");
  publicKeyList.setAttribute("class", "select");
  publicKeyList.setAttribute("id", "publicKeys_" + ownershipIndex);
  publicKeyList.style.width = "500px";

  ownershipEl.appendChild(authorizedPublicKeyLabel);
  ownershipEl.appendChild(authorizedPublicKeyInput);
  ownershipEl.appendChild(authorizedPublicKeyButtonAdd);
  ownershipEl.appendChild(storageNoncePublicKeyButtonAdd);
  ownershipEl.appendChild(document.createElement("br"));
  ownershipEl.appendChild(document.createElement("br"));
  ownershipEl.appendChild(publicKeyList);
  document.querySelector("#ownerships").appendChild(ownershipEl);
};

window.addPublicKey = (ownershipIndex) => {
  const publicKey = document.querySelector(
    "#authPublicKey_" + ownershipIndex
  ).value;
  if (publicKey == "") {
    return;
  }
  ownerships[ownershipIndex].authorizedKeys.push({ publicKey: publicKey });
  addPublicKeyToTheList(ownershipIndex, publicKey);
  document.querySelector("#authPublicKey_" + ownershipIndex).value = "";
};

window.loadStorageNoncePublicKey = async (ownershipIndex) => {
  const publicKey = await archethic.network.getStorageNoncePublicKey();
  ownerships[ownershipIndex].authorizedKeys.push({ publicKey: publicKey });
  addPublicKeyToTheList(ownershipIndex, publicKey);
};

window.addPublicKeyToTheList = (ownershipIndex, publicKey) => {
  const option = document.createElement("option");
  option.text = publicKey;
  option.value = publicKey;
  const select = document.querySelector("#publicKeys_" + ownershipIndex);
  select.appendChild(option);
};
