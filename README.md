![Node.js CI](https://github.com/archethic-foundation/libjs/workflows/Node.js%20CI/badge.svg?branch=master)

# Archethic SDK Javascript

Official Archethic Javascript library for Node and Browser.

## Installing

```bash
npm install @archethicjs/sdk
```

## Usage

When it comes to private data manipulation, your application has two options :

1. **Standalone :** store private keys on your own
2. **WalletRPC :** delegate sensitive operations to a Wallet application. (**recommended**, but still Alpha)

The second option is strongly preferable : it preserves you from security problematics. When your web application needs to perform a sensitive operation (signing a Transaction, reading a Transaction secrets), it will ask **Archethic Wallet** application to perform it.
That way, cryptographic secrets never leak from the **Archethic Wallet**.

The only requirement is user has to run an **Archethic Wallet** on their computer.

> If your application does not perform any sensitive operation, **WalletRPC** is probably not necessary.

### Using the network with WalletRPC

This library aims to provide an easy way to interact with Archethic network.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345") // Endpoint is the Archethic Wallet RPC server
await archethic.connect(); // Connect to the endpoint to retrieve the nearest endpoints

console.log(archethic)
{
   transaction: ..., // module to manage transaction
   account: ..., // module to manage keychains and account
   network: ..., // module to fetch information from the network
   rpcWallet: ..., /// module to interact with WalletRPC
}
```

### Using the network without WalletRPC

This library aims to provide an easy way to interact with Archethic network.

```js
import Archethic from "@archethicjs/sdk";

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

**Note**: `archethic.connect()` is useful but not mandatory. In the case of using a website on HTTPS, making a query to a node through HTTP creates a **Mixed content** issue. To avoid this issue, we can use directly `new Archethic(httpsEndpoint)` which will be used as fallback.

If you still want to use the nearest point while being on an HTTPS website, you could call a server endpoint to make the query for you.

## API

  <details>
   <summary>Account</summary>

### newKeychainTransaction(keychain, transactionChainIndex)

Creates a new transaction to build (or update) a keychain by embedding the on-chain encrypted wallet.

- `keychain` The keychain to create
- `transactionChainIndex` The index of the transaction created (0 for new keychain)

#### Example of keychain creation

```js
import Archethic, { Crypto, Keychain } from "@archethicjs/sdk";

const accessSeed = "myseed";
const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
const keychain = new Keychain(Crypto.randomSecretKey())
  .addService("uco", "m/650'/0/0")
  .addAuthorizedPublicKey(publicKey);

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();
const tx = archethic.account.newKeychainTransaction(keychain, 0);
// The transaction can then be signed with origin private key
```

#### Example of keychain update

```js
import Archethic, { Crypto } from "@archethicjs/sdk";

const accessSeed = "myseed";
const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();
let keychain = await archethic.account.getKeychain(accessSeed);
keychain.addService("mywallet", "m/650'/1/0");

// determine the new transaction index
const keychainGenesisAddress = Crypto.deriveAddress(keychain.seed, 0);
const transactionChainIndex = await archethic.transaction.getTransactionIndex(keychainGenesisAddress);

const tx = archethic.account.newKeychainTransaction(keychain, transactionChainIndex);
// The transaction can then be signed with origin private key
```

### newAccessKeychainTransaction(seed, keychainAddress)

Creates a new keychain access transaction to allow a seed and its key to access a keychain

- `seed` Keychain access's seed
- `keychainAddress` Keychain's tx address

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
const tx = archethic.account.newAccessKeychainTransaction("myseed", keychainAddress);
// The transaction can then be signed with origin private key
```

### getKeychain(seed)

Retrieve a keychain from the keychain access transaction and decrypt the wallet to retrieve the services associated

- `seed` Keychain access's seed

```js
import Archethic from "@archethicjs/sdk"

const archethic = new Archethic("https://testnet.archethic.net")
await archethic.connect()

const keychain = await archethic.account.getKeychain(accessKeychainSeed)
console.log(keychain)
{
  version: 1,
  seed: "masterKeychainSeed",
  authorizedPublicKeys: [ Uint8Array(34) ],
  services: {
    uco: {
      derivationPath: "m/650'/0/0"
    }
  }
}
```

**Once retreived the keychain provide the following methods:**

#### buildTransaction(tx, service, index, suffix)

Generate `address`, `previousPublicKey`, `previousSignature` of the transaction and
serialize it using a custom binary protocol, based on the derivation path, curve and hash algo of the service given in param.

- `tx` is an instance of `TransactionBuilder`
- `service` is the service name to use for getting the derivation path, the curve and the hash algo
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see the cryptography section)
- `suffix`: Additional information to add to a service derivation path (default to empty)

Return is the signed `TransactionBuilder`. Notice that the function also sign the `TransactionBuilder` given in param, so getting the return is not mandatory

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);

const index = archethic.transaction.getTransactionIndex(keychain.deriveAddress("uco", 0));
/*const signedTx =*/ keychain.buildTransaction(tx, "uco", index);
```

#### deriveAddress(service, index, suffix)

Derive an address for the given service at the index given

- `service`: Service name to identify the derivation path to use
- `index`: Chain index to derive (default to 0)
- `suffix`: Additional information to add to a service derivation path (default to empty)

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
const genesisUCOAddress = keychain.deriveAddress("uco", 0);
```

#### deriveKeypair(service, index, suffix)

Derive a keypair for the given service at the index given

- `service`: Service name to identify the derivation path to use
- `index`: Chain index to derive (default to 0)
- `suffix`: Additional information to add to a service derivation path (default to empty)

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
const { publicKey } = keychain.deriveKeypair("uco", 0);
```

#### ecEncryptServiceSeed(service, publicKeys)

Use ec encryption on the seed for the list of authorizedPublicKeys

- `service`: Service name to identify the derivation path to use
- `authorizedPublicKeys`: List of public keys to encrypt the service seed

```js
import Archethic, { Keychain, Crypto } from "@archethicjs/sdk";

const archethic = new Archethic("http://testnet.archethic.net");
await archethic.connect();

const keychain = new Keychain(Crypto.randomSecretKey()).addService("uco", "m/650'/uco");

const storageNonce = await archethic.network.getStorageNoncePublicKey();

const { secret, authorizedPublicKeys } = keychain.ecEncryptServiceSeed("uco", [storageNonce]);
// secret and authorizedPublicKeys can be used to create an ownership
const tx = archethic.transaction.new().addOwnership(secret, authorizedPublicKeys);
```

#### toDID()

Return a Decentralized Identity document from the keychain. (This is used in the transaction's content of the keychain tx)

```js
import Archethic from "@archethicjs/sdk";

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
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
keychain.addService("nft1", "m/650'/1/0")
console.log(keychain)
{
  version: 1,
  seed: "mymasterseed",
  authorizedPublicKeys: [ Uint8Array(34) ],
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

#### removeService(name)

Remove a service from the keychain

- `name`: Name of the service to add

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const keychain = await archethic.account.getKeychain(accessKeychainSeed);
keychain.removeService("nft1");
```

#### addAuthorizedPublicKey(publicKey)

Authorize a key to access the keychain

- `publicKey`: The public key (type: Uint8Array)

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const accessSeed = "myseed";
const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
const keychain = await archethic.account.getKeychain(accessKeychainSeed);
keychain.addAuthorizedPublicKey(publicKey);
```

#### removeAuthorizedPublicKey(publicKey)

Unauthorized a key to access the keychain

- `publicKey`: The public key (type: Uint8aArray)

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const accessSeed = "myseed";
const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
const keychain = await archethic.account.getKeychain(accessKeychainSeed);
keychain.removeAuthorizedPublicKey(publicKey);
```

  </details>

  <details>
    <summary>Transactions</summary>

### new()

To create a new transaction instance to build and to send to the network

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const txBuilder = archethic.transaction.new();
```

The transaction builder instance contains the following methods:

#### setType(type)

Define the transaction type

- `type` is the string defining the type of transaction to generate ("keychain", "keychain_access", "transfer", "hosting", "code_proposal", "code_approval", "token")

#### setContract(contract)

Add the contract in the `data.contract` section of the transaction

- `contract` is an object with following keys:
  - `bytecode` Uint8Array of the compiled wasm code compressed using zip
  - `manifest` the manifest of the contrat containing actions and functions spec

```js
const bytecode = fs.readFileSync("./dist/contract.wasm")
const manifestFile = fs.readFileSync('./dist/manifest.json', 'utf-8')
const manifest = JSON.parse(manifestFile)

const contract = new Contract(bytecode, manifest)

const txBuilder = archethic.transaction.new().setType("contract").setContract(contract)
// or use Contract function
import { Contract } from "@archethicjs/sdk"
const archethic = new Archethic("https://testnet.archethic.net")
const tx = Contract.newContractTransaction(archethic, contract, seed)
```

#### setGenerateEncryptedSeedSC(flag)

Set a flag to request a wallet to add the chain seed in the ownership of the transaction to create a smart contract.
This function is only usefull when sending / signing the transaction through a wallet. Signing and sending the transaction directly to the node will not use this flag.

- `flag` is a boolean to request the node to add the chain seed in the ownership

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
- `amount` is the number of uco to send (in Big Int ref function `parseBigInt`)

#### addTokenTransfer(to, amount, tokenAddress, tokenId)

Add a token transfer to the `data.ledger.token.transfers` section of the transaction

- `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
- `amount` is the number of uco to send (in Big Int ref function `parseBigInt`)
- `tokenAddress` is hexadecimal encoding or Uint8Array representing the token's address to spend
- `tokenId` is the ID of the token to send (default to: 0)

#### addRecipient(to, action, args)

Adds a recipient to call the smart contract's "transaction" action.

- `to` is the contract's address in hexadecimal or Uint8Array
- `action` is the name of the action
- `args` is an object containing the parameter for the contract action. This parameter is not mandatory

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addRecipient("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "increment")
  .addRecipient("0000bc96b1a9751d3750edb9381a55b5b4e4fb104c10b0b6c9a00433ec464637bfab", "vote", {name: "Dr. Who"});
```

#### build(seed, index, curve, hashAlgo)

Generate `address`, `previousPublicKey`, `previousSignature` of the transaction and
serialize it using a custom binary protocol.

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default o "P256"
- `hashAlgo` is the hash algorithm to use to generate the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "bake2b") - default to "sha256"

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
  .build("mysuperpassphraseorseed", 0);
```

#### originSign(privateKey)

Sign the transaction with an origin device private key

- `privateKey` is hexadecimal encoding or Uint8Array representing the private key to generate the origin signature to able to perform the ProofOfWork and authorize the transaction

```js
import Archethic from "@archethicjs/sdk";
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
import Archethic from "@archethicjs/sdk";
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
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42);

const signaturePayload = tx.previousSignaturePayload();
```

#### setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey)

Setter method for the transaction's previous signature and previous public key.

- `prevSign` is hexadecimal encoding or Uint8Array previous signature of the transaction
- `prevPubKey` is hexadecimal encoding or Uint8Array previous public key of the transaction

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42);

const signaturePayload = tx.previousSignaturePayload();
const prevSign = someFunctionToGetSignature(signaturePayload);
const prevPubKey = someFunctionToGetPubKey();
tx.setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey);
```

#### setAddress(address)

Setter method for the transaction's address.

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42);

const txAddress = someFunctionToGetTxAddress();
tx.setAddress(txAddress);
```

#### originSignaturePayload()

Get an Uint8Array payload to be signed with the origin private key of the device.

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
  .build(seed, originPrivateKey);

const originPayload = tx.originSignaturePayload();
```

#### setOriginSign(signature)

Setter method for the transaction's origin signature.

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
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
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
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
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.42)
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
import Archethic from "@archethicjs/sdk";
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
import Archethic from "@archethicjs/sdk"

const archethic = new Archethic("https://testnet.archethic.net")
const tx = ...
const fee = await archethic.transaction.getTransactionFee(tx)
console.log(fee)
{
  fee: 11779421, // Big Int format
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
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
const ownerships = await archethic.transaction.getTransactionOwnerships(tx.address);
console.log(ownerships)[
  {
    secret: "...",
    authorizedPublicKeys: [
      {
        publicKey: "...",
        encryptedSecretKey: ""
      }
    ]
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
import Archethic from "@archethicjs/sdk";
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
  supply: 3340000000000000, // Big Int format
  symbol: 'MUCO',
  type: 'fungible'
}
```

### callFunction(contractAddress, functionName, args)

Call a Smart Contract's exported function with given args.

- `contractAddress` is the address of the contract (usually latest or genesis)
- `functionName` is the exported function to call
- `args` is the list of arguments to call the function with

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const response = await archethic.network.callFunction("0000AB...CD", "add", [1, 2]);
console.log(response);
3;
```

### getBalance(address)

Query a node to fetch the last balance of the given address

- `address` is the address of the account to get the balance from

```js
import Archethic from "@archethicjs/sdk"
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect()

const balance = await archethic.network.getBalance(accountAddress);
console.log(balance)
{
  uco: 100000000,
  tokens: [{
    address: '209DFA0C.....',
    tokenId: 'ABD829FD.....',
    amount: 100000000
  }]
}
```

### addOriginKey(originPublicKey, certificate)

Query a node to add a new origin public to be authorized to sign transaction with the corresponding private key (see OriginSign).

- `originPublicKey` is the public key to be added.
- `certificate` is the certificate that prove the public key is allowed to be added.

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect();
const response = await archethic.network.addOriginKey(originPublicKey, certificate);

console.log(response);
{
  transaction_address: "...";
  status: "pending";
}
```

### getStorageNoncePublicKey()

Fetch the public key of the shared storage node key

```js
import Archethic from "@archethicjs/sdk";
const archethic = new Archethic("https://testnet.archethic.net");

await archethic.connect();

const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
// 00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646
```

### getContractCode(address)

Return the contract code

- `address`: string or Uint8Array of the contract address

```js
import Archethic from "@archethicjs/sdk"

const archethic = new Archethic("https://testnet.archethic.net")
await archethic.connect()

const res = archethic.network.getContractCode("0001234...")
console.log(res)
{
  code: "...",
  contract: {
    bytecode: "00231654",
    manifest: {
      abi: {
        state: ...,
        functions: []
      }
    }
  }
}
```

### getOracleData(timestamp)

Fetch the OracleChain data

- `timestamp`: UNIX timestamp (optional)

```js
import Archethic from "@archethicjs/sdk"

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
import Archethic from "@archethicjs/sdk"

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

### rawGraphQLQuery(query)

Query the GraphQL API of the node with a custom graphQL query that fits your needs.

- `query`: The graphQL query to send to the node

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("https://testnet.archethic.net");
await archethic.connect();

const query = `
query {
  transactions(page:1) {
    address
    chainLength
    data {
      code
    }
    type
    version
  }
}
`;

const response = await archethic.network.rawGraphQLQuery(query);
```

### subscribeToOracleUpdates(handler)

Subscribe to get the real time updates of the OracleChain

- `handler`: Callback to handle the new data

```js
import Archethic from "@archethicjs/sdk"

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
  <summary>Wallet RPC</summary>

### setOrigin(origin)

Configures the DApp identity. DApp identity will be sent to WalletRPC.

On operations requiring user's confirmation, that identity might be displayed.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});
```

### onconnectionstatechange(callback)

Listens to connection state changes between DApp and WalletRPC.

```js
import Archethic from "@archethicjs/sdk"

const archethic = new Archethic("ws://localhost:12345")
await archethic.connect()

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
})

archethic.rpcWallet.onconnectionstatechange(
  (rpcConnectionState) {
    console.log(`WalletRPC connection state changed : ${rpcConnectionState}`)
  }
)

// To stop listening :
archethic.rpcWallet.unsubscribeconnectionstatechange()
```

### getAccounts()

Reads a concise accounts list from ArchethicWallet.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

archethic.rpcWallet.getAccounts().then((accounts) => {
  accounts.forEach((account) => {
    console.log(`\t ${JSON.stringify(account)}`);
  });
});
```

### getServices()

Reads a concise services list from ArchethicWallet.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url "https://great_app.com"
});

archethic.rpcWallet.getServices().then((services) => {
  services.forEach((service) => {
    console.log(`\t ${JSON.stringify(service)}`);
  });
});
```

### onAccountUpdate(accountName, callback) : RpcSubscription

Listens to an account's changes.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

const subscription = await archethic.rpcWallet.onAccountUpdate("account name", (account) => {
  console.log(JSON.stringify(account));
});
```

### onCurrentAccountChange(callback) : RpcSubscription

Listens account selection in wallet.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

const subscription = await archethic.rpcWallet.onCurrentAccountChange((account) => {
  console.log(JSON.stringify(account));
});
```

### refreshCurrentAccount()

Request the wallet to refresh current account info

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

await archethic.rpcWallet.refreshCurrentAccount();
// Wallet account is refreshed with last blockchain informations
```

### unsubscribe(rpcSubscription)

Stops any subscription to Wallet.

```js
import Archethic from "@archethicjs/sdk"

const archethic = new Archethic("ws://localhost:12345")
await archethic.connect()

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
})

const subscription // subscription from a previous call (onAccountUpdate for example)

await archethic.rpcWallet.unsubscribe(subscription)
```

### sendTransaction(transaction)

Asks ArchethicWallet to sign and send a transaction.

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

const tx = archethic.transaction
  .new()
  .setType("token")
  .setContent(
    '{ "name": "NFT 001", "supply": 100000000, "type": "non-fungible", "symbol": "NFT1", "aeip": [2], "properties": {}}'
  );

archethic.rpcWallet
  .sendTransaction(tx)
  .then((sendResult) => {
    console.log(JSON.stringify(sendResult));
    // { transactionAddress: "asdfasfsadf", nbConfirmations: 3, maxConfirmations: 3 }
  })
  .catch((sendError) => {
    console.log(JSON.stringify(sendResult));
  });
```

### signTransactions([transaction])

Asks ArchethicWallet to sign multiple transactions.

```js
import Archethic, { Utils } from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

const tx = archethic.transaction
  .new()
  .setType("transfer")
  .addTokenTransfer("0001ABCD...", Utils.parseBigInt('12'), "00001234...", 0)
  .addRecipient("0001ABCD...", "swap");

archethic.rpcWallet
  .signTransactions(tx)
  .then((signedResult) => {
    console.log(JSON.stringify(signedResult));
    signedResult.forEach((signedTransaction) => {
      console.log(JSON.stringify(signedTransaction));
      // {address: "000ef....", previousPublicKey: "00045b...", previousSignature: "000ef....", originSignature: "00045b..."}
    });
  })
  .catch((signedError) => {
    console.log(JSON.stringify(signedError));
  });
```

### addService(name)

Add a service in the keychain

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

archethic.rpcWallet
  .addService("myService")
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error) => {
    console.log(error);
  });
```

### keychainDeriveKeypair(serviceName, index, pathSuffix)

Derive a keypair for the given service at the index given and get the public key

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

archethic.rpcWallet.keychainDeriveKeypair("myService", 1, "suffix").then((result) => {
  console.log(result["publicKey"]);
});
```

### keychainDeriveAddress(serviceName, index, pathSuffix)

Derive an address for the given service at the index given

```js
import Archethic from "@archethicjs/sdk";

const archethic = new Archethic("ws://localhost:12345");
await archethic.connect();

await archethic.rpcWallet.setOrigin({
  name: "My DApp",
  url: "https://great_app.com"
});

archethic.rpcWallet.keychainDeriveAddress("myService", 1, "suffix").then((result) => {
  console.log(result["address"]);
});
```

  </details>

  <details>
  <summary>Cryptography</summary>

  <br />

### deriveKeyPair(seed, index, curve)

It creates a new keypair into hexadecimal format

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default to: "ed25519"
- `origin_id` is the origin of the public key (can be 0 for "on chain wallet", 1 for "software" or 2 for "tpm") - default to: 1

```js
import { Crypto } from "@archethicjs/sdk";
const { publicKey: publicKey, privateKey: privateKey } = Crypto.deriveKeyPair("mysuperpassphraseorseed", 0);
// publicKey => 0100048cac473e46edd109c3ef59eec22b9ece9f99a2d0dce1c4ccb31ce0bacec4a9ad246744889fb7c98ea75c0f0ecd60002c07fae92f23382669ca9aff1339f44216
```

### deriveAddress(seed, index, curve, hashAlgo)

It creates a transaction address by extract the public key from the key derivation and hash it into a hexadecimal format

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - Default to "ed25519"
- `hashAlgo` is the hash algorithm to create the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "blake2b") - default to "sha256"

```js
import { Crypto } from "@archethicjs/sdk";
const address = Crypto.deriveAddress("mysuperpassphraseorseed", 0);
// Address: 00004195d45987f33e5dcb71edfa63438d5e6add655b216acfdd31945d58210fe5d2
```

It creates a new keypair and extract the public key into hexadecimal format

- `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
- `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
- `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")

```js
import { Crypto } from "@archethicjs/sdk";
const publicKey = Crypto.derivePublicKey("mysuperpassphraseorseed", 0);
```

### ecEncrypt(data, publicKey)

Perform an ECIES encryption using a public key and a data

- `data` Data to encrypt
- `publicKey` Public key to derive a shared secret and for whom the content must be encrypted

```js
import { Crypto } from "@archethicjs/sdk";
const cipher = Crypto.ecEncrypt(
  "dataToEncrypt",
  "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
);
```

### ecDecrypt(cipher, privateKey)

Perform an ECIES decryption using a private key and an encrypted data

- `cipher` Data to decrypt
- `privateKey` Private key to derive a shared secret and for whom the content must be decrypted

```js
import { Crypto } from "@archethicjs/sdk";
const cipher = Crypto.ecDecrypt("dataToDecrypt", "36f7753a63188eabaf4891c5724d346da58160cdc386ebf248603724d1796cd3");
```

### aesEncrypt(data, publicKey)

Perform an AES encryption using a key and a data

- `data` Data to encrypt
- `key` Symmetric key

```js
import { Crypto } from "@archethicjs/sdk";
const cipher = Crypto.aesEncrypt(
  "dataToEncrypt",
  "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
);
```

  </details>

  <details>
  <summary>Utils</summary>

### formatBigInt(number, decimals)

Convert a big int number to a x decimals string (mainly use to display token amount)

- `number` Big Int number to convert to decimals number
- `decimals` number of decimals needed (default to 8)

```js
import { Utils } from "@archethicjs/sdk";
Utils.formatBigInt(BigInt(1_253_450_000));
// '12.5345'
Utils.formatBigInt(BigInt(12_534_500), 6);
// '12.5345'
```

### parseBigInt(number, decimals)

Convert a string into a BigInt number

- `number` decimals number to convert to Big Int number
- `decimals` number of decimals (default to 8)

```js
import { Utils } from "@archethicjs/sdk";
Utils.parseBigInt('12.5345');
// 1_253_450_000
Utils.parseBigInt('12.5345', 6);
// 12_534_500
```

### originPrivateKey

Getting the default origin Key :

```js
import Archethic, { Utils } from "@archethicjs/sdk"
const originPrivateKey = Utils.originPrivateKey

const archethic = new Archethic("https://testnet.archethic.net")

const tx = archethic.transaction.new()
...
tx.originSign(originPrivateKey)
```

  </details>
  <details>
  <summary>Contract</summary>

  <br />

  ### newContractTransaction(archethic, contract, contractSeed, txData?)

  Create a new contract transaction injecting the bytecode, manifest and the authorized public key encryption to allow node to emit transaction on your behalf.  Returned transaction is already signed.

  ```js
  import Archethic, { Utils, Contract } from "@archethicjs/sdk"
  const archethic = new Archethic("https://testnet.archethic.net")

  const bytecode = fs.readFileSync("./dist/contract.wasm")
  const manifestFile = fs.readFileSync('./dist/manifest.json', 'utf-8')
  const manifest = JSON.parse(manifestFile)

  const contract = new Contract(bytecode, manifest)

  // txData is optional
  const txData = {
    content: "content",
    ledger: {
      uco: {
        transfers: [{to: "1234", amount: Utils.parseBigInt("10")}]
      }
    }
  }
  
  const tx = await Contract.newContractTransaction(archethic, contract, contractSeed, txData)

  tx
    .originSign(Utils.originPrivateKey)
    .on("requiredConfirmation", () => console.log("ok deployed"))
    .on("error", (context, reason) => console.error(reason))
    .send();
  ```

  ### updateContractTransaction(archethic, contractAddress, contract)

  Create a new transaction containing the recipient filled with appropriated function to update a contract code

  ```js
  import Archethic, { Utils, Contract } from "@archethicjs/sdk"
  const archethic = new Archethic("https://testnet.archethic.net")

  const bytecode = fs.readFileSync("./dist/contract.wasm")
  const manifestFile = fs.readFileSync('./dist/manifest.json', 'utf-8')
  const manifest = JSON.parse(manifestFile)

  const contract = new Contract(bytecode, manifest)

  const tx = await Contract.updateContractTransaction(archethic, contractAddress, contract)

  tx
    .build(seed, index)
    .originSign(Utils.originPrivateKey)
    .on("requiredConfirmation", () => console.log("ok updated"))
    .on("error", (context, reason) => console.error(reason))
    .send();
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
cd example/keychain
npm install
npm run start
```

### TransactionBuilder

```bash
cd example/transactionBuilder
npm install
npm run start
```

### Miscellaneous

If you want to leverage React for your DApp, you have to rely on [react-app-rewired](https://www.npmjs.com/package/react-app-rewired) to avoid errors regarding NodeJS module not accessible in the Webpack build.

You can see how to resolve the issues in this [article](https://www.alchemy.com/blog/how-to-polyfill-node-core-modules-in-webpack-5)

## Licence

AGPL3
