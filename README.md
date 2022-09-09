![Node.js CI](https://github.com/archethic-foundation/libjs/workflows/Node.js%20CI/badge.svg?branch=master)


# Archethic SDK Javascript

Official Archethic Javascript library for Node and Browser.

## Installing

```bash
npm install archethic
```

## Usage

This library aims to provide a easy way to create Archethic transaction and to send them over the network.

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
   
## API

  <details>
  <summary>Cryptographic functions</summary>
  <br/>

  #### getOriginKey()
  Return the hardcoded origin private key for software, this is used for signing transaction (see OriginSign).

  ```js
  const archethic = require("archethic")
  const tx = '...'
  const originPrivateKey = archethic.getOriginKey()
  tx.originSign(originPrivateKey)
  ```

  #### deriveKeyPair(seed, index, curve)

  It creates a new keypair into hexadecimal format

  - `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default to: "ed25519"

  ```js
  const archethic = require("archethic")
  const { publicKey: publicKey, privateKey: privateKey} = archethic.deriveKeyPair("mysuperpassphraseorseed", 0)
  // publicKey => 0100048cac473e46edd109c3ef59eec22b9ece9f99a2d0dce1c4ccb31ce0bacec4a9ad246744889fb7c98ea75c0f0ecd60002c07fae92f23382669ca9aff1339f44216 
  ```

  #### deriveAddress(seed, index, curve, hashAlgo)

  It creates a transaction address by extract the public key from the key derivation and hash it into a hexadecimal format

  - `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - Default to "ed25519"
  - `hashAlgo` is the hash algorithm to create the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "blake2b") - default to "sha256"

  ```js
  const archethic = require("archethic")
  const address = archethic.deriveAddress("mysuperpassphraseorseed", 0)
  // Address: 00004195d45987f33e5dcb71edfa63438d5e6add655b216acfdd31945d58210fe5d2
  ```

  It creates a new keypair and extract the public key into hexadecimal format

  - `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")

  ```js
  const archethic = require("archethic")
  const publicKey = archethic.derivePublicKey("mysuperpassphraseorseed", 0)
  ```

  #### ecEncrypt(data, publicKey)
  Perform an ECIES encryption using a public key and a data
  
  - `data` Data to encrypt
  - `publicKey` Public key to derive a shared secret and for whom the content must be encrypted
  
  ```js
  const archethic = require('archethic')
  const cipher = archethic.ecEncrypt("dataToEncrypt","0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
  ```

  #### aesEncrypt(data, publicKey)
  Perform an AES encryption using a key and a data
  
  - `data` Data to encrypt
  - `key` Symmetric key
  
  ```js
  const archethic = require('archethic')
  const cipher = archethic.aesEncrypt("dataToEncrypt","0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
  ```
  </details>
  <br/>
  <details>
  <summary>Transaction building</summary>
  <br/>
  
  `newTransactionBuilder(type)` creates a new instance of the transaction builder
  
  `type` is the string defining the type of transaction to generate ("keychain", "keychain_access", "transfer", "hosting", "code_proposal", "code_approval", "token")
  
  The transaction builder instance contains the following methods:
  
  #### setCode(code)
  Add the code in the `data.code` section of the transaction
  `code` is a string defining the smart contract
  
  #### setContent(content)
  Add the content in the `data.content` section of the transaction
  `content` is a string defining the smart contract
  
  #### addOwnership(secret, authorizedKeys)
  Add an ownership in the `data.ownerships` section of the transaction with a secret and its related authorized public keys to be able to decrypt it.
  This aims to prove the ownership or the delegatation of some secret to a given list of public keys.

  `secret` is the hexadecimal encoding or Uint8Array representing the encrypted secret
  `authorizedKeys` is a list of object represented by 
    - `publicKey` is the hexadecimal encoding or Uint8Array representing the public key
    - `encryptedSecretKey` is the hexadecimal encoding or Uint8Array representing the secret key encrypted with the public key (see `ecEncrypt`)
  
  #### addUCOTransfer(to, amount)
  Add a UCO transfer to the `data.ledger.uco.transfers` section of the transaction
  - `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
  - `amount` is the number of uco to send (float)

  #### addTokenTransfer(to, amount, token_address, token_id)
  Add a token transfer to the `data.ledger.token.transfers` section of the transaction
  - `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
  - `amount` is the number of uco to send (float)
  - `token_address` is hexadecimal encoding or Uint8Array representing the token's address to spend
  - `token_id` is the ID of the token to send (default to: 0)

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
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 
  ```

  #### originSign(privateKey)
  Sign the transaction with an origin device private key

   - `privateKey` is hexadecimal encoding or Uint8Array representing the private key to generate the origin signature to able to perform the ProofOfWork and authorize the transaction

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 
    .originSign(originPrivateKey)
  ```
  #### toJSON()
  Export the transaction generated into JSON

  ```js
  const archethic = require('archethic')
  const txJSON = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 
    .toJSON()
  ```
  ### Interacting with other signer (hardware for example)

  #### previousSignaturePayload()
  Get an Uint8Array payload to be signed with user seed

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 

    const signaturePayload = tx.previousSignaturePayload()
  ```
  #### setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey)
  Setter method for the transaction's previous signature and previous public key.

  - `prevSign` is hexadecimal encoding or Uint8Array previous signature of the transaction
  - `prevPubKey` is hexadecimal encoding or Uint8Array previous public key of the transaction

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420)

    const signaturePayload = tx.previousSignaturePayload()
    const prevSign = someFunctionToGetSignature(signaturePayload)
    const prevPubKey = someFunctionToGetPubKey()
    tx.setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey)
  ```
  #### setAddress(address)
  Setter method for the transaction's address.

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420)

    const txAddress = someFunctionToGetTxAddress()
    tx.setAddress(txAddress)
  ```
  #### originSignaturePayload()
  Get an Uint8Array payload to be signed with the origin private key of the device.

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 

    const originPayload = tx.originSignaturePayload()
  ```
  #### setOriginSign(signature)
  Setter method for the transaction's origin signature.

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 

    const originPayload = tx.originSignaturePayload()
    const originSignature = someFunctionToGetSignature(originPayload)
    tx.setOriginSign(originSignature)
  ```
  </details>
  <br/>
  <details>
  <summary>Transaction sending</summary>
  <br/>
  `newTransactionSender()` creates a new instance of the transaction sender. It is an observable that trigger events.
  
  The transaction sender instance contains the following methods:

  #### send(tx, endpoint, confirmationThreshold, timeout)
  - `tx` represent the built transaction from the **transactionBuilder**
  - `endpoint` is the HTTP URL to a Archethic node (acting as welcome node)
  - `confirmationThreshold` is a pourcentage (0 to 100) where the transaction is considered as validated. This is used to trigger `requiredConfirmation` event. Default value is to 100. This parameter is not mandatory
  - `timeout` is the number of second to wait until timeout event is triggered. Default value is to 60 sec. This parameter is not mandatory

  Send a transaction to the endpoint and subscribe the node to get confirmation or validation error.
  When an update of the validation is received from the subscription, some events are triggered and associated function are called (see function **on** bellow)

  ```js
  tx = archethic.newTransactionBuilder('transfer')
  ...
  sender = archethic.newTransactionSender()
  .on('confirmation', (nbConf, maxConf) => console.log(nbConf, maxConf))

  sender.send(tx, 'http://testnet.archethic.net')
  ```
  #### on(event, handler)
  Subscribe to a specific event.
  - `event` is the name of the event to subscribe
  - `handler` is a function which will be called when event is triggered

  available events:
  - `'sent'` triggered when transaction is sent. handler param: no parameter
  - `'confirmation'` triggered when a new replication is received. handler params: number of replication, maximum number of replication expected
  - `'fullConfirmation'` triggered when the number of replication = the number of maximum replication expected. handler param: maximum number of replication expected
  -  `'requiredConfirmation'` triggered when the number of replication is equal or overpass for the first time the maximum replication * confirmationThreshold. handler param: number of replication
  - `'error'` triggered when an error is encountered during validation. handler params: context, reason
    - Context is a string with "INVALID_TRANSACTION" for error in the transaction itself like "Insufficient funds" or "NETWORK_ISSUE" for error in mining like "Consensus error".
  - `'timeout'` triggered 60  sec after sending the transaction. Timeout is cleared when `'fullConfirmation'`, `'error'` or `'requiredConfirmation'` events are triggered. handler param: number of replication received yet

  Mutiple function can be assigned to a same event. Just call function `on` mutiple times for the same event.

  ```js
  tx = archethic.newTransactionBuilder('transfer')
  ...
  sender = archethic.newTransactionSender()
  .on('sent', () => console.log('transaction sent !'))
  .on('confirmation', (nbConf, maxConf) => console.log(nbConf, maxConf))
  .on('fullConfirmation', (nbConf) => console.log(nbConf))
  .on('requiredConfirmation', (nbConf) => console.log(nbConf))
  .on('error', (context, reason) => console.log(context, reason))
  .on('timeout', (nbConf) => console.log(nbConf))
  .send(tx, 'http://testnet.archethic.net', 60)
  ```

  #### unsubscribe(event)
  Unsubscribe to a specific event or all events.
  - `event` is the name of the event (same as **on** function). This parameter is not mandatory, if the event name is empty all events are unsubscribed.

  </details>
  <br/>
  <details>
  <summary>Remote Endpoint calls</summary>
  <br/>

  #### addOriginKey(originPublicKey, certificate, endpoint)
  Query a node to add a new origin public to be authorized to sign transaction with the corresponding private key (see OriginSign).

  - `originPublicKey` is the public key to be added.
  - `certificate` is the certificate that prove the public key is allowed to be added.
  - `endpoint` is the HTTP URL to a Archethic node

  Returns
  
  ```js
  {
    transaction_address: "..."
    status: "pending"
  }
  ```

  Getting the default origin Key :
  ```js
  const archethic = require('archethic')
  const originPrivateKey = archethic.getOriginKey()
  const tx = archethic.newTransactionBuilder("transfer")
  ...
  tx.originSign(originPrivateKey)
  ```

  #### getTransactionIndex(address, endpoint)
  Query a node to find the length of the chain to retrieve the transaction index
  
  - `address` Transaction address (in hexadecimal)
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getTransactionIndex("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "https://testnet.archethic.net")
  // 0
  ```

  #### getStorageNoncePublicKey(endpoint)
  Query a node to find the public key of the shared storage node key
  
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getStorageNoncePublicKey("https://testnet.archethic.net")
  // 00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646
  ```

  #### getTransactionFee(tx, endpoint)
  Query a node to fetch the tx fee for a given transaction
  
  - `tx` Generated transaction
  - `endpoint` Node endpoint
  
  ```js
  const archethic = require('archethic')
  const tx = ...
  const { fee: fee } = await archethic.getTransactionFee(tx, "https://testnet.archethic.net")
  ```

  #### getTransactionOwnerships(address, endpoint)
  Query a node to find the ownerships (secrets and authorized keys) to given transaction's address

  - `address`: Transaction's address
  - `endpoint`: Node endpoint

  ```js
  const archethic = require('archethic')
  const ownerships = await archethic.getTransactionOwnerships(tx.address, "https://testnet.archethic.net")
  console.log(ownerships)
  [
    {
      secret: "...",
      authorizedPublicKeys: [
        {
          publicKey: "...",
          encryptedSecretKey: ""
        }
      ] 
    }
  ]
  ```
  
  #### getLastOracleData(endpoint)
  Query a node to get the latest OracleChain data

  - `endpoint`: Node endpoint

  ```js
  const archethic = require('archethic')
  const oracleData = await archethic.getLastOracleData("https://testnet.archethic.net")
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
  
  #### getOracleDataAt(timestamp, endpoint)
  Query a node to get the OracleChain data at a given time

  - `timestamp`: UNIX timestamp
  - `endpoint`: Node endpoint

  ```js
  const archethic = require('archethic')
  const oracleData = await archethic.getOracleDataAt(timestamp, "https://testnet.archethic.net")
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
  
  #### subscribeToOracleUpdates(endpoint, handler)
  Subscribe to a node to get the real time updates of the OracleChain

  - `endpoint`: Node endpoint
  - `handler`: Callback to handle the new data

  ```js
  const archethic = require('archethic')
  await archethic.subscribeToOracleUpdates("https://testnet.archethic.net", console.log)
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
  <br/>
  <details>
  <summary>Keychain / Wallet management</summary>
  <br/>

  #### newKeychainTransaction(seed, authorizedPublicKeys, originPrivateKey)
  Creates a new transaction to build a keychain by embedding the on-chain encrypted wallet.

  - `seed` Keychain's seed
  - `authorizedPublicKeys` List of authorized public keys able to decrypt the wallet
  - `originPrivateKey` Key to make the origin signature of the transaction

  #### newAccessKeychainTransaction(seed, keychainAddress, originPrivateKey)
  Creates a new keychain access transaction to allow a seed and its key to access a keychain

  - `seed` Keychain access's seed
  - `keychainAddress` Keychain's tx address
  - `originPrivateKey` Key to make the origin signature of the transaction  

  #### getKeychain(seed, endpoint)
  Retrieve a keychain from the keychain access transaction and decrypt the wallet to retrieve the services associated

  - `seed` Keychain access's seed
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const keychain = await archethic.getKeychain(accessKeychainSeed, "https://testnet.archethic.net")
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
  const endpoint = "https://testnet.archethic.net"
  
  const tx = archethic.newTransactionBuilder("transfer")
  .addUCOTransfer(...)
  const keychain = archethic.getKeychain(accessKeychainSeed, endpoint)

  const index = archethic.getTransactionIndex(
    keychain.deriveAddress("uco", 0),
    endpoint
  )
  /*const signedTx =*/ keychain.buildTransaction(tx, "uco", index)
  ```

  #### deriveAddress(service, index)
  Derive an address for the given service at the index given

  - `service`: Service name to identify the derivation path to use
  - `index`: Chain index to derive (default to 0)

  ```js
  const keychain = await archethic.getKeychain(accessKeychainSeed, "https://testnet.archethic.net")
  const genesisUCOAddress = keychain.deriveAddress("uco", 0)
  ``` 

  #### deriveKeypair(service, index)
  Derive a keypair for the given service at the index given

  - `service`: Service name to identify the derivation path to use
  - `index`: Chain index to derive (default to 0)
  
  ```js
  const keychain = await archethic.getKeychain(accessKeychainSeed, "https://testnet.archethic.net")
  const { publicKey } = keychain.deriveKeypair("uco", 0)
  ``` 

  #### toDID()
  Return a Decentralized Identity document from the keychain. (This is used in the transaction's content of the keychain tx)

  ```js
  const keychain = await archethic.getKeychain(accessKeychainSeed, "https://testnet.archethic.net")
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
  const keychain = await archethic.getKeychain(accessKeychainSeed, "https://testnet.archethic.net")
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
  <br/>
  <details>
  <summary>Utils</summary>
  <br/>

  #### fromBigInt(number)
  Convert a big int number to a 8 decimals number (mainly use to display token amount)

  ```js
  archethic.fromBigInt(1_253_000_000)
  // 12.53
  ```
  </details>
  <br/>
  
## Running the tests

```bash
npm run test
```

## Licence

AGPL3
