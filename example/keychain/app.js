import Archethic, { Crypto, Utils } from 'archethic'

const { toBigInt } = Utils

let endpoint = document.querySelector("#endpoint").value;

let archethic = new Archethic(endpoint);

document
  .querySelector("#endpoint")
  .addEventListener("change", async function () {
    archethic = new Archethic(this.value);
  });


// This function creates 2 transactions:
//
//  - the KEYCHAIN transaction (with a difficult random seed)
//
//  - the KEYCHAIN_ACCESS transaction (with the given seed)
//      contains a ownership to the KEYCHAIN
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
    const { seed } = keychain;

    document.querySelector("#keychainSeed2").innerText = Utils.uint8ArrayToHex(seed);

    displayServices(keychain)
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

window.addRandomServiceToKeychain = async () => {
  await archethic.connect();

  const accessSeed = document.querySelector("#accessSeed").value;
  archethic.account.getKeychain(accessSeed)
    .then((keychain) => {
      const randString = Math.random().toString(16).substr(2, 8);
      const randInteger = Math.random().toString().substr(2, 3);
      keychain.addService(randString, `m/650'/${randInteger}/0`);

      return archethic.updateKeychain(keychain)
        .then(() => {
          displayServices(keychain)
        })
    })
    .catch((e) => {
      console.error(e);
      throw e;
    });
};

window.removeServiceFromKeychain = async (serviceName) => {
  await archethic.connect();

  const accessSeed = document.querySelector("#accessSeed").value;
  archethic.account.getKeychain(accessSeed)
    .then((keychain) => {
      keychain.removeService(serviceName)

      return archethic.updateKeychain(keychain)
        .then(() => {
          displayServices(keychain)
        })
    })
    .catch((e) => {
      console.error(e);
      throw e;
    });
};


function displayServices(keychain) {
  let servicesContainer = document.querySelector("#services");
  servicesContainer.innerHTML = ""

  for (service in keychain.services) {
    const { derivationPath } = keychain.services[service];

    var serviceContainer = document.createElement("div");
    var serviceBox = document.createElement("div");
    serviceBox.classList = "title is-child box";

    var serviceNameEl = document.createElement("p");
    serviceNameEl.innerText = service;
    serviceNameEl.classList = "title";
    serviceBox.appendChild(serviceNameEl);

    serviceContainer.appendChild(serviceBox);

    var serviceDerivationPathEl = document.createElement("p");
    serviceDerivationPathEl.innerText = "Derivation path: " + derivationPath;
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

      var removeBtn = document.createElement("button");
      removeBtn.innerText = "Remove";
      removeBtn.setAttribute("onClick", `removeServiceFromKeychain("${service}");`);

      serviceAddressEl.appendChild(serviceAddressLink);
      serviceDetails.appendChild(serviceAddressEl);
      serviceDetails.appendChild(removeBtn);
    }

    serviceBox.appendChild(serviceDetails);

    servicesContainer.appendChild(serviceContainer);
  }
}