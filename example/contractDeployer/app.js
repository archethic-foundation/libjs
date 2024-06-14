import Archethic, { Utils, Crypto, Contract } from "@archethicjs/sdk";

/** @type {Archethic | undefined} */
let archethic = undefined;

async function connectEndpoint() {
  const endpoint = document.querySelector("#endpoint").value;
  archethic = new Archethic(endpoint);
  await archethic.connect();
}

window.onload = async function () {
  await connectEndpoint();
};

document.querySelector("#endpoint").addEventListener("change", async function () {
  await connectEndpoint();
});

window.getTransactionIndex = async () => {
  const seed = document.querySelector("#seed").value;
  const curve = document.querySelector("#curve").value;

  const address = Crypto.deriveAddress(seed, 0, curve);
  const nb = await archethic.transaction.getTransactionIndex(address);
  document.querySelector("#index").value = nb;
};

let signedTx;
window.generate_transaction = async () => {
  document.querySelector("#transactionOutput").style.visibility = "hidden";

  const seed = document.querySelector("#seed").value;
  const code = document.querySelector("#code").value;

  const txBuilder = await Contract.newContractTransaction(archethic, code, seed);
  signedTx = txBuilder.originSign(Utils.originPrivateKey);
  document.querySelector("#transactionOutput #address").innerText = Utils.uint8ArrayToHex(signedTx.address);
  document.querySelector("#transactionOutput").style.visibility = "visible";
  const result = await archethic.transaction.getTransactionFee(signedTx);
  const amount = Utils.fromBigInt(result.fee);
  const usdValue = (result.rates.usd * amount).toFixed(4);
  document.querySelector("#tx_fee").innerText = `${amount} UCO ($${usdValue})`;
};

window.sendTransaction = async () => {
  document.querySelector("#confirmations").innerText = 0;

  let explorerLink;
  const transactionAddress = Utils.uint8ArrayToHex(signedTx.address);

  if (archethic.rpcWallet && archethic.rpcWallet.connectionState == "WalletRPCConnection_open") {
    const { endpointUrl } = await archethic.rpcWallet.getEndpoint();
    explorerLink = endpointUrl + "/explorer/transaction/" + transactionAddress;
  } else {
    const endpoint = document.querySelector("#endpoint").value;
    explorerLink = endpoint + "/explorer/transaction/" + transactionAddress;
  }

  signedTx
    .on("confirmation", (nbConfirmations, maxConfirmations) => {
      document.querySelector("#transaction_error").style.display = "none";
      document.querySelector("#confirmed").style.display = "block";
      document.querySelector("#confirmations").innerText = nbConfirmations;
      document.querySelector("#maxConfirmations").innerText = maxConfirmations;
    })
    .on("error", (context, error) => {
      let errMsg = `<p>${context}</p><p style="padding-left: 10px">(${error.code}) ${error.message}</p>`;
      if (error.data && error.data.message) {
        if (error.data.recipient) {
          errMsg += `<p style="padding-left: 20px">Calling ${error.data.recipient}</p>`;
        }
        if (error.data.data) {
          errMsg += `<p style="padding-left: 20px">(${error.data.data.code}) ${error.data.data.message}</p>`;
        } else {
          errMsg += `<p style="padding-left: 20px">${error.data.message}</p>`;
        }
      }

      document.querySelector("#confirmed").style.display = "none";
      document.querySelector("#transaction_error").style.display = "block";
      document.querySelector("#error_reason").innerHTML = errMsg;
    })
    .on("sent", () => {
      document.querySelector("#success").style.display = "block";
      document.querySelector("#tx_address_link").innerText = explorerLink;
      document.querySelector("#tx_address_link").setAttribute("href", explorerLink);
    })
    .send();
};
