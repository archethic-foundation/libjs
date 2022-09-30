![Node.js CI](https://github.com/archethic-foundation/libjs/workflows/Node.js%20CI/badge.svg?branch=master)

# Archethic SDK Javascript

Official Archethic Javascript library for Node and Browser.

## Installing

```bash
npm install archethic
```

## Usage

This library aims to provide a easy way to interact with Archethic network.

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect(); // Connect to the endpoint to retrieve the nearest endpoints

console.log(archethic)
{
   transaction: ..., // module to manage transaction
   account: ..., // module to manage keychains and account
   network: ..., // module to fetch information from the network
   ...
}
```

## API

  <details>
   <summary>Account</summary>

### newKeychainTransaction(seed, authorizedPublicKeys)

Creates a new transaction to build a keychain by embedding the on-chain encrypted wallet.

- `seed` Keychain's seed
- `authorizedPublicKeys` List of authorized public keys able to decrypt the wallet

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
const tx = archethic.account.newKeychainTransaction("myseed", [
  authorizedPublicKey,
]);

// The transaction can then be signed with origin private key
```

### newAccessKeychainTransaction(seed, keychainAddress)

Creates a new keychain access transaction to allow a seed and its key to access a keychain

- `seed` Keychain access's seed
- `keychainAddress` Keychain's tx address

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
const tx = archethic.account.newAccessKeychainTransaction("myseed", keychainAddress);

// The transaction can then be signed with origin private key
#### getKeychain(seed, endpoint)
```

### getKeychain(seed)

Retrieve a keychain from the keychain access transaction and decrypt the wallet to retrieve the services associated

- `seed` Keychain access's seed

```js
import Archethic from "archethic"

const archethic = new Archethic("https://testnet.archethic.net")
await archethic.connect()

const keychain = await archethic.account.getKeychain(accessKeychainSeed)
console.log(keychain)
{
  version: 1,
  seed: "masterKeychainSeed",
  services: {
    uco: {
      derivationPath: "m/650'/0/0"
    }
  }
}
```

**Once retreived the keychain provide the following methods:**

#### buildTransaction(tx, service, index)

Generate `address`, `previousPublicKey`, `previousSignature` of the transaction and
serialize it using a custom binary protocol, based on the derivation path, curve and hash algo of the service given in param.

- `tx` is an instance of `TransactionBuilder`
- `service` is the service name to use for getting the derivation path, the curve and the hash algo
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see the cryptography section)

Return is the signed `TransactionBuilder`. Notice that the function also sign the `TransactionBuilder` given in param, so getting the return is not mandatory

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);

const index = archethic.transaction.getTransactionIndex(
  keychain.deriveAddress("uco", 0)
);
/*const signedTx =*/ keychain.buildTransaction(tx, "uco", index);
```

#### deriveAddress(service, index)

Derive an address for the given service at the index given

- `service`: Service name to identify the derivation path to use
- `index`: Chain index to derive (default to 0)

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
const genesisUCOAddress = keychain.deriveAddress("uco", 0);
```

#### deriveKeypair(service, index)

Derive a keypair for the given service at the index given

- `service`: Service name to identify the derivation path to use
- `index`: Chain index to derive (default to 0)

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
const { publicKey } = keychain.deriveKeypair("uco", 0);
```

#### toDID()

Return a Decentralized Identity document from the keychain. (This is used in the transaction's content of the keychain tx)

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
const did  = keychain.toDID()
console.log(did)
{
  "@context": [
     "https://www.w3.org/ns/did/v1"
  ],
  "id": "did:archethic:keychain_address",
  "authentification": servicesMaterials, //list of public keys of the services
  "verificationMethod": servicesMaterials //list of public keys of the services
}
```

#### addService(name, derivationPath, curve, hashAlgo)

Add a service into the keychain

- `name`: Name of the service to add
- `derivationPath`: Crypto derivation path
- `curve`: Elliptic curve to use
- `hashAlgo`: Hash algo

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
keychain.addService("nft1", "m/650'/1/0")
console.log(keychain)
{
  version: 1,
  seed: "mymasterseed",
  services: {
    uco: {
      derivationPath: "m/650'/0/0",
      curve: "ed25519",
      hashAlgo: "sha256"
    },
    nft1: {
      derivationPath: "m/650'/1/0",
      curve: "ed25519",
      hashAlgo: "sha256"
    }
  }
}
```

  </details>

  <details>
    <summary>Transactions</summary>

### new()

To create a new transaction instance to build and to send to the network

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const txBuilder = archethic.transaction.new();
```

The transaction builder instance contains the following methods:

#### setType(type)

Define the transaction type

- `type` is the string defining the type of transaction to generate ("keychain", "keychain_access", "transfer", "hosting", "code_proposal", "code_approval", "token")

#### setCode(code)

Add the code in the `data.code` section of the transaction

- `code` is a string defining the smart contract

#### setContent(content)

Add the content in the `data.content` section of the transaction

- `content` is a string defining the smart contract

#### addOwnership(secret, authorizedKeys)

Add an ownership in the `data.ownerships` section of the transaction with a secret and its related authorized public keys to be able to decrypt it.
This aims to prove the ownership or the delegatation of some secret to a given list of public keys.

- `secret` is the hexadecimal encoding or Uint8Array representing the encrypted secret
- `authorizedKeys` is a list of object represented by - `publicKey` is the hexadecimal encoding or Uint8Array representing the public key - `encryptedSecretKey` is the hexadecimal encoding or Uint8Array representing the secret key encrypted with the public key (see `ecEncrypt`)

#### addUCOTransfer(to, amount)

Add a UCO transfer to the `data.ledger.uco.transfers` section of the transaction

- `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
- `amount` is the number of uco to send (in Big Int ref function `toBigInt`)

#### addTokenTransfer(to, amount, tokenAddress, tokenId)

Add a token transfer to the `data.ledger.token.transfers` section of the transaction

- `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
- `amount` is the number of uco to send (in Big Int ref function `toBigInt`)
- `tokenAddress` is hexadecimal encoding or Uint8Array representing the token's address to spend
- `tokenId` is the ID of the token to send (default to: 0)

#### addRecipient(to)

Add a recipient (for non UCO transfers, ie. smart contract interaction) to the `data.recipient` section of the transaction

- `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient)

#### build(seed, index, curve, hashAlgo)

Generate `address`, `previousPublicKey`, `previousSignature` of the transaction and
serialize it using a custom binary protocol.

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default o "P256"
- `hashAlgo` is the hash algorithm to use to generate the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "bake2b") - default to "sha256"

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build("mysuperpassphraseorseed", 0);
```

#### originSign(privateKey)

Sign the transaction with an origin device private key

- `privateKey` is hexadecimal encoding or Uint8Array representing the private key to generate the origin signature to able to perform the ProofOfWork and authorize the transaction

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build("mysuperpassphraseorseed", 0);
  .originSign(originPrivateKey);
```

#### toJSON()

Export the transaction generated into JSON

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build("mysuperpassphraseorseed", 0);
  .toJSON();
```

### Interacting with other signer (hardware for example)

#### previousSignaturePayload()

Get an Uint8Array payload to be signed with user seed

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  );

const signaturePayload = tx.previousSignaturePayload();
```

#### setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey)

Setter method for the transaction's previous signature and previous public key.

- `prevSign` is hexadecimal encoding or Uint8Array previous signature of the transaction
- `prevPubKey` is hexadecimal encoding or Uint8Array previous public key of the transaction

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  );

const signaturePayload = tx.previousSignaturePayload();
const prevSign = someFunctionToGetSignature(signaturePayload);
const prevPubKey = someFunctionToGetPubKey();
tx.setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey);
```

#### setAddress(address)

Setter method for the transaction's address.

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  );

const txAddress = someFunctionToGetTxAddress();
tx.setAddress(txAddress);
```

#### originSignaturePayload()

Get an Uint8Array payload to be signed with the origin private key of the device.

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build(seed, originPrivateKey);

const originPayload = tx.originSignaturePayload();
```

#### setOriginSign(signature)

Setter method for the transaction's origin signature.

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build("mysuperpassphraseorseed", 0);

const originPayload = tx.originSignaturePayload();
const originSignature = someFunctionToGetSignature(originPayload);
tx.setOriginSign(originSignature);
```

#### send(confirmationThreshold, timeout)

- `confirmationThreshold` is a percentage (0 to 100) where the transaction is considered as validated. This is used to trigger `requiredConfirmation` event. Default value is to 100. This parameter is not mandatory
- `timeout` is the number of second to wait until timeout event is triggered. Default value is to 60 sec. This parameter is not mandatory

Send a transaction to the endpoint and subscribe the node to get confirmation or validation error.
When an update of the validation is received from the subscription, some events are triggered and associated function are called (see function **on** bellow)

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build("mysuperpassphraseorseed", 0)
  .originSign(privateKey)
  .on("confirmation", (nbConf, maxConf) => console.log(nbConf, maxConf))
  .send();
```

#### on(event, handler)

Subscribe to a specific event.

- `event` is the name of the event to subscribe
- `handler` is a function which will be called when event is triggered

available events:

- `'sent'` triggered when transaction is sent. handler param: no parameter
- `'confirmation'` triggered when a new replication is received. handler params: number of replication, maximum number of replication expected
- `'fullConfirmation'` triggered when the number of replication = the number of maximum replication expected. handler param: maximum number of replication expected
- `'requiredConfirmation'` triggered when the number of replication is equal or overpass for the first time the maximum replication \* confirmationThreshold. handler param: number of replication
- `'error'` triggered when an error is encountered during validation. handler params: context, reason
  - Context is a string with "INVALID_TRANSACTION" for error in the transaction itself like "Insufficient funds" or "NETWORK_ISSUE" for error in mining like "Consensus error".
- `'timeout'` triggered 60 sec after sending the transaction. Timeout is cleared when `'fullConfirmation'`, `'error'` or `'requiredConfirmation'` events are triggered. handler param: number of replication received yet

Mutiple function can be assigned to a same event. Just call function `on` mutiple times for the same event.

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer(
    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    0.42
  )
  .build("mysuperpassphraseorseed", 0)
  .originSign(privateKey)
  .on("sent", () => console.log("transaction sent !"))
  .on("confirmation", (nbConf, maxConf) => console.log(nbConf, maxConf))
  .on("fullConfirmation", (nbConf) => console.log(nbConf))
  .on("requiredConfirmation", (nbConf) => console.log(nbConf))
  .on("error", (context, reason) => console.log(context, reason))
  .on("timeout", (nbConf) => console.log(nbConf))
  .send(60); // confirmationThreshold: 60
```

#### unsubscribe(event)

Unsubscribe to a specific event or all events.

- `event` is the name of the event (same as **on** function). This parameter is not mandatory, if the event name is empty all events are unsubscribed.

### getTransactionIndex(address)

Query a node to find the length of the chain to retrieve the transaction index

- `address` Transaction address (in hexadecimal)

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect();
const txIndex = await archethic.transaction.getTransactionIndex(
  "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
);
// 0
```

### getTransactionFee(tx)

Query a node to fetch the tx fee for a given transaction

- `tx` Generated transaction

```js
import Archethic from "archethic"

const archethic = new Archethic("https://testnet.archethic.net")
const tx = ...
const fee = await archethic.transaction.getTransactionFee(tx)
console.log(fee)
{
  fee: 11779421, // Big Int format (ref function fromBigInt)
  rates: {
    eur: 0.086326,
    usd: 0.084913
  }
}
```

### getTransactionOwnerships(address)

Query a node to find the ownerships (secrets and authorized keys) to given transaction's address

- `address`: Transaction's address

```js
import Archethic from "archethic";

const archethic = new Archethic("https://testnet.archethic.net");
const ownerships = await archethic.transaction.getTransactionOwnerships(
  tx.address
);
console.log(ownerships)[
  {
    secret: "...",
    authorizedPublicKeys: [
      {
        publicKey: "...",
        encryptedSecretKey: "",
      },
    ],
  }
];
```

  </details>

  <details>
    <summary>Network</summary>

### getToken(tokenAddress)

Query a node to get the token definition (based on [AEIP2](https://github.com/archethic-foundation/aeip/blob/main/AEIP-2.md)) from an address.
Returns also `genesis` address and `id`

- `tokenAddress` is the transaction address of the token.

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect();
const token = await archethic.network.getToken(tokenAddress);
console.log(token);
{
  collection: [],
  decimals: 8,
  genesis: '0000D6979F125A91465E29A12F66AE40FA454A2AD6CE3BB40099DBDDFFAF586E195A',
  id: '9DC6196F274B979E5AB9E3D7A0B03FEE3E4C62C7299AD46C8ECF332A2C5B6574',
  name: 'Mining UCO rewards',
  properties: {},
  supply: 3340000000000000, // Big Int format (ref function fromBigInt)
  symbol: 'MUCO',
  type: 'fungible'
}
```

### addOriginKey(originPublicKey, certificate)

Query a node to add a new origin public to be authorized to sign transaction with the corresponding private key (see OriginSign).

- `originPublicKey` is the public key to be added.
- `certificate` is the certificate that prove the public key is allowed to be added.

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect();
const response = await archethic.network.addOriginKey(
  originPublicKey,
  certificate
);

console.log(response);
{
  transaction_address: "...";
  status: "pending";
}
```

### getStorageNoncePublicKey()

Fetch the public key of the shared storage node key

```js
import Archethic from "archethic";
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect();

const storageNoncePublicKey =
  await archethic.network.getStorageNoncePublicKey();
// 00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646
```

### getOracleData(timestamp)

Fetch the OracleChain data

- `timestamp`: UNIX timestamp (optional)

```js
import Archethic from "archethic"

const archethic = new Archethic("https://testnet.archethic.net")
await archethic.connect()

const oracleData = await archethic.network.getOracleData()
console.log(oracleData)
{
  timestamp: ...,
  services: {
    uco: {
      eur: ...,
      usd: ...
    }
  }
}
```

```js
import Archethic from "archethic"

const archethic = new Archethic("https://testnet.archethic.net")
await archethic.connect()

const oracleData = await archethic.network.getOracleData(timestamp)
console.log(oracleData)
{
  services: {
    uco: {
      eur: ...,
      usd: ...
    }
  }
}
```

### subscribeToOracleUpdates(handler)

Subscribe to get the real time updates of the OracleChain

- `handler`: Callback to handle the new data

```js
import Archethic from "archethic"

const archethic = new Archethic("https://testnet.archethic.net")
await archethic.connect()

await archethic.network.subscribeToOracleUpdates(console.log)
{
  timestamp: ...,
  services: {
    uco: {
      eur: ...,
      usd: ...
    }
  }
}
```

  </details>

  <details>
  <summary>Cryptography</summary>

  <br />

It supports the Archethic Cryptography rules which are:

- Algorithm identification: keys are prepared by metadata bytes to indicate the curve used and the origin of the generation, and hashes are prepended by a byte to indicate the hash algorithm used.
  Those information help during the verification

  ```

      Ed25519   Software Origin   Public key
        |          |              |
        |  |-------|              |
        |  |   |------------------|
        |  |   |
      <<0, 0, 106, 58, 193, 73, 144, 121, 104, 101, 53, 140, 125, 240, 52, 222, 35, 181,
      13, 81, 241, 114, 227, 205, 51, 167, 139, 100, 176, 111, 68, 234, 206, 72>>

       NIST P-256  Software Origin   Public key
        |            |              |
        |  |---------|              |
        |  |  |----------------------
        |  |  |
      <<1, 0, 4, 7, 161, 46, 148, 183, 43, 175, 150, 13, 39, 6, 158, 100, 2, 46, 167,
       101, 222, 82, 108, 56, 71, 28, 192, 188, 104, 154, 182, 87, 11, 218, 58, 107,
      222, 154, 48, 222, 193, 176, 88, 174, 1, 6, 154, 72, 28, 217, 222, 147, 106,
      73, 150, 128, 209, 93, 99, 115, 17, 39, 96, 47, 203, 104, 34>>
  ```

- Key derivation:

  To be able to retrieve previous public key, the Archethic network designs the key derivation through a seed (passphrase) and an index(number of
  previous public keys/transactions).
  The procedure is described as follows:

  ```
  The seed generates a master key and an entropy used in the child keys generation.

                                                             / (256 bytes) Next private key
                        (256 bytes) Master key  --> HMAC-512
                      /                              Key: Master entropy,
    seed --> HASH-512                                Data: Master key + index)
                      \
                       (256 bytes) Master entropy

  ```

### deriveKeyPair(seed, index, curve)

It creates a new keypair into hexadecimal format

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default to: "ed25519"

```js
import { Crypto } from "archethic";
const { publicKey: publicKey, privateKey: privateKey } = Crypto.deriveKeyPair(
  "mysuperpassphraseorseed",
  0
);
// publicKey => 0100048cac473e46edd109c3ef59eec22b9ece9f99a2d0dce1c4ccb31ce0bacec4a9ad246744889fb7c98ea75c0f0ecd60002c07fae92f23382669ca9aff1339f44216
```

### deriveAddress(seed, index, curve, hashAlgo)

It creates a transaction address by extract the public key from the key derivation and hash it into a hexadecimal format

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - Default to "ed25519"
- `hashAlgo` is the hash algorithm to create the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "blake2b") - default to "sha256"

```js
import { Crypto } from "archethic";
const address = Crypto.deriveAddress("mysuperpassphraseorseed", 0);
// Address: 00004195d45987f33e5dcb71edfa63438d5e6add655b216acfdd31945d58210fe5d2
```

It creates a new keypair and extract the public key into hexadecimal format

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")

```js
import { Crypto } from "archethic";
const publicKey = Crypto.derivePublicKey("mysuperpassphraseorseed", 0);
```

### ecEncrypt(data, publicKey)

Perform an ECIES encryption using a public key and a data

- `data` Data to encrypt
- `publicKey` Public key to derive a shared secret and for whom the content must be encrypted

```js
import { Crypto } from "archethic";
const cipher = Crypto.ecEncrypt(
  "dataToEncrypt",
  "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
);
```

### aesEncrypt(data, publicKey)

Perform an AES encryption using a key and a data

- `data` Data to encrypt
- `key` Symmetric key

```js
import { Crypto } from "archethic";
const cipher = Crypto.aesEncrypt(
  "dataToEncrypt",
  "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
);
```

  </details>
  
  <details>
  <summary>Utils</summary>

### fromBigInt(number, decimals)

Convert a big int number to a x decimals number (mainly use to display token amount)
- `number` Big Int number to convert to decimals number
- `decimals` number of decimals needed (default to 8)

```js
import { Utils } from "archethic";
Utils.fromBigInt(1_253_450_000);
// 12.5345
Utils.fromBigInt(12_534_500, 6);
// 12.5345
```

### toBigInt(number, decimals)

Convert a decimals number to a BigInt number
- `number` decimals number to convert to Big Int number
- `decimals` number of decimals (default to 8)

```js
import { Utils } from "archethic";
Utils.toBigInt(12.5345);
// 1_253_450_000
Utils.toBigInt(12.5345, 6);
// 12_534_500
```

### originPrivateKey

Getting the default origin Key :

```js
import Archethic, { Utils } from "archethic"
const originPrivateKey = Utils.originPrivateKey

const archethic = new Archethic("https://testnet.archethic.net")

const tx = archethic.transaction.new()
...
tx.originSign(originPrivateKey)
```

  </details>
  
## Running the tests

```bash
npm run test
```

## Examples

Some examples are present to see how to use the SDK

### Keychain

```bash
cd examples/keychain
npm run start
```

### TransactionBuilder

```bash
cd examples/transactionBuilder
npm run start
```

## Licence

AGPL3
