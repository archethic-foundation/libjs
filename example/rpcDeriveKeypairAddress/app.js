import Archethic, { Utils } from 'archethic';
import { ArchethicRPCClient, RpcRequestOrigin } from '../../lib/api/wallet_rpc';

const { toBigInt } = Utils;

let file_content = "";

let ucoTransfers = [];
let tokenTransfers = [];
let recipients = [];
let ownerships = [];

ArchethicRPCClient.instance.setOrigin(new RpcRequestOrigin(
  'Wallet RPC example application',
))

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

window.derive_keypair = async () => {
    let deriveKeypairButton = document.getElementById("deriveKeypairButton")
    deriveKeypairButton.disabled = true;

    const serviceName = document.getElementById("serviceName").value
    const index = parseInt(document.getElementById("index").value) || 0
    const suffix = document.getElementById("pathSuffix").value || ""

    let keyPairContainer = document.getElementById("keypairResult")

    archethic.rpcWallet.keychainDeriveKeypair(serviceName, index, suffix).then((result) => {
        document.getElementById("publicKey").innerText = result.publicKey;
        keyPairContainer.style.visibility = "visible";
        deriveKeypairButton.disabled = false;
    })
}

window.derive_address = async () => {
    let deriveAddressButton = document.getElementById("deriveAddressButton")
    deriveAddressButton.disabled = true;

    const serviceName = document.getElementById("serviceNameAddress").value
    const index = parseInt(document.getElementById("indexAddress").value) || 0
    const suffix = document.getElementById("pathSuffixAddress").value || ""

    let addressContainer = document.getElementById("addressResult")

    archethic.rpcWallet.keychainDeriveAddress(serviceName, index, suffix).then((result) => {
        document.getElementById("address").innerText = result.address;
        addressContainer.style.visibility = "visible";
        deriveAddressButton.disabled = false;
    })
}

window.generate_transaction = async () => {
  document.querySelector("#transactionOutput").style.visibility = "hidden";
  const sendTxButton = document.querySelector("#tx_send_button")
  sendTxButton.disabled = true;
  let serviceName = document.getElementById("serviceName").value
  archethic.rpcWallet.addService(serviceName).then((sendResult) => {
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


window.show_services = async () => {
  let servicesContainer = document.getElementById("servicesList")
  servicesContainer.innerHTML = ""
  archethic.rpcWallet.getServices().then((services) => {
    services.forEach((service) => {
      let serviceElement = document.createElement("li")
      serviceElement.innerText = `curve: ${service.curve} - derivationPath: ${service.derivationPath} - hashAlgo: ${service.hashAlgo}`
      servicesContainer.appendChild(serviceElement)
    })
  })
};


