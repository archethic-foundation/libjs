import Archethic, { Utils } from '../../dist/index';
import { ArchethicRPCClient } from '../../dist/api/wallet_rpc';

const { toBigInt } = Utils;

let file_content = "";

let ucoTransfers = [];
let tokenTransfers = [];
let recipients = [];
let ownerships = [];

ArchethicRPCClient.instance.setOrigin( {name: 'Wallet RPC example application'})

/** @type {Archethic | undefined} */
let archethic = undefined

window.onload = function () {
  const endpoint = document.querySelector("#endpoint").value;
  console.log(`Endpoint : ${endpoint}`)
  const localArchethic = new Archethic(endpoint);
  localArchethic.rpcWallet.onconnectionstatechange((state) => {
    document
      .querySelector("#rpcConnectionStatus")
      .textContent = state
  })
  localArchethic.connect();
  archethic = localArchethic
}

window.generate_transaction = async () => {
  document.querySelector("#transactionOutput").style.visibility = "hidden";

  let content = document.querySelector("#content").value;
  if (file_content != "") {
    content = file_content;
  }

  let txBuilder = archethic.transaction
    .new()
    .setType(document.querySelector("#type").value)
    .setCode(document.querySelector("#code").value)
    .setContent(content);

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

  let sendTxButton = document.querySelector("#tx_send_button")
  sendTxButton.disabled = true;
  archethic.rpcWallet.sendTransaction(txBuilder).then((sendResult) => {
    document.querySelector("#transactionOutput #address").innerText =
      sendResult.transactionAddress;
    document.querySelector("#transactionOutput").style.visibility = "visible";

    document.querySelector("#transaction_error").style.display = "none";
    document.querySelector("#confirmed").style.display = "block";
    document.querySelector("#confirmations").innerText = sendResult.nbConfirmations;
    document.querySelector("#maxConfirmations").innerText = sendResult.maxConfirmations;

    document.querySelector("#success").style.display = "block";
    document.querySelector("#tx_address_link").innerText =
      archethic.endpoint.nodeEndpoint +
      "/explorer/transaction/" +
      sendResult.transactionAddress;
    document
      .querySelector("#tx_address_link")
      .setAttribute(
        "href",
        archethic.endpoint.nodeEndpoint +
        "/explorer/transaction/" +
        sendResult.transactionAddress
      );

  }).catch((sendError) => {
    document.querySelector("#confirmed").style.display = "none";
    document.querySelector("#transaction_error").style.display = "block";
    document.querySelector("#error_reason").innerText = JSON.stringify(sendError);
  }).finally(() => {
    sendTxButton.disabled = false;
  })
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
    ownerships[ownershipIndex] = { secret: e.target.value, authorizedPublicKeys: [] };
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
