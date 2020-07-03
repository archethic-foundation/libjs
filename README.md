![Node.js CI](https://github.com/UNIRIS/uniris-libjs/workflows/Node.js%20CI/badge.svg?branch=master)

# Uniris SDK Javascript

Offical Uniris Javascript library for Node and Browser.

## Installing

```bash
npm install uniris
```

## Usage

This library aims to provide a easy way to create Uniris transaction and to send them over the network.

It supports the Uniris Cryptography rules which are:

- Algorithm identification: the first byte of key and hashes identify the curve or the digest algorithm used to help determine which algorithm during
  verification.
  
  ```

      Ed25519    Public key
        |           /
        |          /
      <<0, 106, 58, 193, 73, 144, 121, 104, 101, 53, 140, 125, 240, 52, 222, 35, 181,
      13, 81, 241, 114, 227, 205, 51, 167, 139, 100, 176, 111, 68, 234, 206, 72>>

       NIST P-256   Public key
        |          /
        |         /
      <<1, 4, 7, 161, 46, 148, 183, 43, 175, 150, 13, 39, 6, 158, 100, 2, 46, 167,
       101, 222, 82, 108, 56, 71, 28, 192, 188, 104, 154, 182, 87, 11, 218, 58, 107,
      222, 154, 48, 222, 193, 176, 88, 174, 1, 6, 154, 72, 28, 217, 222, 147, 106,
      73, 150, 128, 209, 93, 99, 115, 17, 39, 96, 47, 203, 104, 34>>
  ```
  
- Key derivation:
  
    To be able to retrieve previous public key, the Uniris network designs the key derivation through a seed (passphrase) and an index(number of
     previous public keys/transactions).
    The procedure is described as follows:
    
    ```
    The seed generates a master key and an entropy used in the child keys generation.

                                                               / (256 bytes) Next private key
                          (256 bytes) Master key  --> HMAC-512
                        /                              Key: Master entropy,
      seed --> HMAC-512                                Data: Master key + index)
                        \
                         (256 bytes) Master entropy

    ```
    
 This libary is used some third party library to support multiple elliptic curves:
   - `libsodium-wrappers`
   - `elliptic`
   
   
## API

  ### derivatePublicKey(seed, index, curve)

  It creates a new keypair and extract the public key into hexadecimial format

  - `seed` is hexadecimal encoding or ArrayBuffer representing the transaction chain seed to be able to derivate and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")

  ```json
  const uniris = require("uniris")
  uniris.derivatePublicKey("mysuperpassphraseorseed", 0)
  // Public key: 00a6e144cdd34c608f88cc5a92d0962e7cfe9843b0bb62fefbdb60eb41814b7c92
  ```

  ### derivateAddress(seed, index, curve, hashAlgo)

  It creates a transaction address by extract the public key from the key derivation and hash it into a hexadecimial format

  - `seed` is hexadecimal encoding or ArrayBuffer representing the transaction chain seed to be able to derivate and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")

  ```json
  const uniris = require("uniris")
  uniris.derivateAddress("mysuperpassphraseorseed", 0)
  // Address: 0092ffdc550ec8d4e4e10506d27229a8d4327d975a6037055e7a563a4783dbe1e8
  ```

  It creates a new keypair and extract the public key into hexadicemial format

  - `seed` is hexadecimal encoding or ArrayBuffer representing the transaction chain seed to be able to derivate and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")

  ```json
  const uniris = require("uniris")
  uniris.derivatePublicKey("mysuperpassphraseorseed", 0)
  ```

  ### newTransactionBuilder(type)
  
  It creates a new instance of the transaction builder
  
  `type` is the string defining the type of transaction to generate ("keychain", "identity", "transfer", "hosting")
  
  returns a **TransactionBuilder** object containins the following methods:
  
  - #### setCode(code)
  Add the code in the `data.code` section of the transaction
  `code` is a string defining the smart contract
  
  - #### setContent(content)
  Add the content in the `data.content` section of the transaction
  `content` is a string defining the smart contract
  
  - #### setSecret(secret)
  Add the secret in the `data.keys.secret` section of the transaction
  `secret` is the hexadecimal encoding or ArrayBuffer representing the encrypted secret
  
  - #### addAuthorizedKey(publicKey, encryptedSecretKey)
  Add an authorized public key to decrypt the secret to the `data.keys.authorizedKeys` section of the transaction
  - `publicKey` is the hexadecimal encoding or ArrayBuffer representing the public key
  - `encryptedSecretKey` is the hexadecimal encoding or ArrayBuffer representing the secret key encrypted with the public key (see `ecEncrypt`)
  
  - #### addUCOTransfer(to, amount)
  Add a UCO transfer to the `data.ledger.uco.transfers` section of the transaction
  - `to` is hexadecimal encoding or ArrayBuffer representing the transaction address (recipient) to receive the funds
  - `amount` is the number of uco to send (float)

  - #### addRecipient(to)
  Add a recipient (for non UCO transfers, ie. smart contract interaction) to the `data.recipient` section of the transaction
  - `to` is hexadecimal encoding or ArrayBuffer representing the transaction address (recipient)
  
  - #### build(seed, index, originPrivateKey, curve, hashAlgo)
  Generate `address`, `timestamp`, `previousPublicKey`, `previousSignature`, `originSignature` of the transaction and 
  serialize it using a custom binary protocol.
  
  - `seed` is hexadecimal encoding or ArrayBuffer representing the transaction chain seed to be able to derivate and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `originPrivateKey` is hexadecimal encoding or ArrayBuffer representing the private key to generate the origin signature to able to perform the ProofOfWork and authorize the transaction
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1")
  - `hashAlgo` is the hash algorithm to use to generate the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "blake2b")
  
  ```js
  const uniris = require('uniris')
  tx = uniris.newTransactionBuilder("transfer")
    .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0, originPrivateKey) 
  ```
  
  ### sendTransaction(tx, endpoint)
  Dispatch  the transaction to a node by serialiazing a GraphQL request
  
  - `tx` represent the built transaction from the **transactionBuilder**
  - `endpoint` is the HTTP URL to a Uniris node (acting as welcome node)
  
  ```js
  const uniris = require('uniris')
  tx = ...
  uniris.sendTransaction(tx, "https://blockchain.uniris.io")
  ```
  
    
  ### ecEncrypt(data, publicKey)
  Perform an ECIES encryption using a public key and a data
  
  - `data` Data to encrypt
  - `publicKey` Public key to derivate a shared secret and for whom the content must be encrypted
  
  ```js
  const uniris = require('uniris')
  uniris.ecEncrypt("dataToEncrypt", "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
  ```

## Running the tests

```bash
npm test
```

## Licence

AGPL3
