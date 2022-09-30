import Archethic, { Crypto, Utils } from 'archethic'

const { toBigInt } = Utils

let endpoint = document.querySelector("#endpoint").value;

let archethic = new Archethic(endpoint);

document
  .querySelector("#endpoint")
  .addEventListener("change", async function () {
    archethic = new Archethic(this.value);
  });

window.createKeychain = async () => {
  await archethic.connect();
  const seed = document.querySelector("#accessSeed").value;

  const originPrivateKey = Utils.originPrivateKey;

  const { publicKey } = Crypto.deriveKeyPair(seed, 0);

  const keychainSeed = Crypto.randomSecretKey();
  const keychainAddress = Crypto.deriveAddress(keychainSeed, 1);

  archethic.account
    .newKeychainTransaction(keychainSeed, [publicKey])
    .originSign(originPrivateKey)
    .on("confirmation", (confirmations, maxConfirmations, sender) => {
      document.querySelector("#keychainSeed1").innerText = Utils.uint8ArrayToHex(keychainSeed);
      let txEndpointLink =
        endpoint + "/explorer/transaction/" + Utils.uint8ArrayToHex(keychainAddress);
      document.querySelector("#keychainTxLink").innerText = txEndpointLink;
      document
        .querySelector("#keychainTxLink")
        .setAttribute("href", txEndpointLink);

      sender.unsubscribe();

      const accessAddress = Crypto.deriveAddress(seed, 1);

      archethic.account
        .newAccessTransaction(seed, keychainAddress)
        .originSign(originPrivateKey)
        .on("confirmation", (confirmation, maxConfirmation, sender) => {
          let txEndpointLink =
            endpoint + "/explorer/transaction/" + Utils.uint8ArrayToHex(accessAddress);
          document.querySelector("#accessKeychainTxLink").innerText =
            txEndpointLink;
          document
            .querySelector("#accessKeychainTxLink")
            .setAttribute("href", txEndpointLink);
          document.querySelector("#keychainCreation").style.display = "block";

          sender.unsubscribe();
        })
        .send();
    })
    .send();
}

window.getKeychain = async () => {
  await archethic.connect();
  const seed = document.querySelector("#accessSeed").value;

  archethic.account.getKeychain(seed).then((keychain) => {
    const { seed, services } = keychain;
    document.querySelector("#keychainSeed2").innerText = Utils.uint8ArrayToHex(seed);

    let servicesContainer = document.querySelector("#services");

    for (service in services) {
      const { derivationPath } = services[service];

      var serviceContainer = document.createElement("div");
      serviceContainer.classList = "tile is-parent";

      var serviceBox = document.createElement("div");
      serviceBox.classList = "title is-child box";

      var serviceNameEl = document.createElement("p");
      serviceNameEl.innerText = service;
      serviceNameEl.classList = "title";
      serviceBox.appendChild(serviceNameEl);

      serviceContainer.appendChild(serviceBox);

      var serviceDerivationPathEl = document.createElement("p");
      serviceDerivationPathEl.innerText =
        "Derivation path: " + services[service].derivationPath;
      serviceDerivationPathEl.classList = "subtitle";
      serviceBox.appendChild(serviceDerivationPathEl);

      var serviceDetails = document.createElement("div");
      serviceDetails.classList = "content";

      if (derivationPath.startsWith("m/650")) {
        var serviceAddressEl = document.createElement("p");
        serviceAddressEl.classList = "is-size-6";
        const address = keychain.deriveAddress(service, 0);

        var serviceAddressLink = document.createElement("a");
        serviceAddressLink.innerText = "Address: " + Utils.uint8ArrayToHex(address);
        serviceAddressLink.setAttribute(
          "href",
          endpoint + "/explorer/transaction/" + Utils.uint8ArrayToHex(address)
        );
        serviceAddressLink.setAttribute("target", "_blank");

        serviceAddressEl.appendChild(serviceAddressLink);
        serviceDetails.appendChild(serviceAddressEl);
      }

      serviceBox.appendChild(serviceDetails);

      servicesContainer.appendChild(serviceContainer);
    }
  });

  document.querySelector("#keychainInfo").style.display = "block";
}

window.sendTransaction = async () => {
  await archethic.connect();

  const seed = document.querySelector("#accessSeed").value;
  const serviceName = document.querySelector("#tx_service_name").value;
  const recipientAddress = document.querySelector("#tx_address").value;
  const ucoAmount = document.querySelector("#tx_amount").value;

  const tx = archethic.transaction
    .new()
    .setType("transfer")
    .addUCOTransfer(recipientAddress, toBigInt(parseFloat(ucoAmount)));

  const originPrivateKey = Utils.originPrivateKey;

  const keychain = await archethic.account.getKeychain(seed, endpoint);
  const genesisAddress = keychain.deriveAddress(service, 0);
  const index = await archethic.transaction.getTransactionIndex(genesisAddress);

  document.querySelector("#confirmations").innerText = 0;

  const signedTx = keychain
    .buildTransaction(tx, serviceName, index)
    .originSign(originPrivateKey);

  signedTx
    .on("confirmation", (nbConfirmations, maxConfirmations, sender) => {
      document.querySelector("#confirmed").style.display = "block";
      document.querySelector("#confirmations").innerText = nbConfirmations;
    })
    .on("error", (reason) => {
      document.querySelector("#errors").innerText = reason;
    })
    .on("sent", () => {
      document.querySelector("#success").style.display = "block";
      document.querySelector("#tx_address_link").innerText =
        endpoint + "/explorer/transaction/" + Utils.uint8ArrayToHex(tx.address);
      document
        .querySelector("#tx_address_link")
        .setAttribute(
          "href",
          endpoint + "/explorer/transaction/" + Utils.uint8ArrayToHex(tx.address)
        );
    })
    .send();
}
