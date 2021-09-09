![Node.js CI](https://github.com/archethic-foundation/libjs/workflows/Node.js%20CI/badge.svg?branch=master)


# ArchEthic SDK Javascript

Official ArchEthic Javascript library for Node and Browser.

## Installing

```bash
npm install archethic
```

## Usage

This library aims to provide a easy way to create ArchEthic transaction and to send them over the network.

It supports the ArchEthic Cryptography rules which are:

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
  
    To be able to retrieve previous public key, the ArchEthic network designs the key derivation through a seed (passphrase) and an index(number of
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

  ### Cryptographic functions

  #### deriveKeyPair(seed, index, curve)

  It creates a new keypair into hexadecimal format

  - `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default to: "P256"

  ```js
  const archethic = require("archethic")
  const { publicKey: publicKey, privateKey: privateKey} = archethic.deriveKeyPair("mysuperpassphraseorseed", 0)
  // publicKey => 0100048cac473e46edd109c3ef59eec22b9ece9f99a2d0dce1c4ccb31ce0bacec4a9ad246744889fb7c98ea75c0f0ecd60002c07fae92f23382669ca9aff1339f44216 
  ```

  #### deriveAddress(seed, index, curve, hashAlgo)

  It creates a transaction address by extract the public key from the key derivation and hash it into a hexadecimal format

  - `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - Default to "P256"
  - `hashAlgo` is the hash algorithm to create the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "blake2b") - default to "sha256"

  ```js
  const archethic = require("archethic")
  const address = archethic.deriveAddress("mysuperpassphraseorseed", 0)
  // Address: 004195d45987f33e5dcb71edfa63438d5e6add655b216acfdd31945d58210fe5d2
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
  const cipher = archethic.aesEncrypt("dataToEncrypt","00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
  ```

  ### TransactionBuilding
  
  `newTransactionBuilder(type)` creates a new instance of the transaction builder
  
  `type` is the string defining the type of transaction to generate ("keychain", "keychain_access", "transfer", "hosting", "code_proposal", "code_approval", "nft")
  
  The transaction builder instance contains the following methods:
  
  #### setCode(code)
  Add the code in the `data.code` section of the transaction
  `code` is a string defining the smart contract
  
  #### setContent(content)
  Add the content in the `data.content` section of the transaction
  `content` is a string defining the smart contract
  
  #### addSecret(secret, authorizedKeys)
  Add a secret in the `data.keys.secrets` section of the transaction with its related authorized public keys able to decrypt it
  `secret` is the hexadecimal encoding or Uint8Array representing the encrypted secret
  `authorizedKeys` is an object represented by `publicKey` => `encryptedSecretKeyForThisKey`
		- `publicKey` is the hexadecimal encoding or Uint8Array representing the public key
		- `encryptedSecretKey` is the hexadecimal encoding or Uint8Array representing the secret key encrypted with the public key (see `ecEncrypt`)
  
  #### addUCOTransfer(to, amount)
  Add a UCO transfer to the `data.ledger.uco.transfers` section of the transaction
  - `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
  - `amount` is the number of uco to send (float)

  #### addNFTTransfer(to, amount, nft_address)
  Add a NFT transfer to the `data.ledger.nft.transfers` section of the transaction
  - `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient) to receive the funds
  - `amount` is the number of uco to send (float)
  - `nft_address` is hexadecimal encoding or Uint8Array representing the NFT address to spend

  #### addRecipient(to)
  Add a recipient (for non UCO transfers, ie. smart contract interaction) to the `data.recipient` section of the transaction
  - `to` is hexadecimal encoding or Uint8Array representing the transaction address (recipient)
  
  #### build(seed, index, curve, hashAlgo)
  Generate `address`, `previousPublicKey`, `previousSignature`, `originSignature` of the transaction and 
  serialize it using a custom binary protocol.
  
  - `seed` is hexadecimal encoding or Uint8Array representing the transaction chain seed to be able to derive and generate the keys
  - `index` is the number of transactions in the chain, to generate the actual and the next public key (see below the cryptography section)
  - `curve` is the elliptic curve to use for the key generation (can be "ed25519", "P256", "secp256k1") - default o "P256"
  - `hashAlgo` is the hash algorithm to use to generate the address (can be "sha256", "sha512", "sha3-256", "sha3-512", "bake2b") - default to "sha256"
  
  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 
  ```

  #### originSign(privateKey)
  Sign the transaction with an origin device private key

   - `privateKey` is hexadecimal encoding or Uint8Array representing the private key to generate the origin signature to able to perform the ProofOfWork and authorize the transaction

  ```js
  const archethic = require('archethic')
  const tx = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 
    .originSign(originPrivateKey)
  ```

  #### toJSON()
  Export the transaction generated into JSON

   ```js
  const archethic = require('archethic')
  const txJSON = archethic.newTransactionBuilder("transfer")
    .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build("mysuperpassphraseorseed", 0) 
    .toJSON()
  ```
  
  ### Remote Endpoint calls
  #### sendTransaction(tx, endpoint)
  Dispatch  the transaction to a node by serializing a GraphQL request
  
  - `tx` represent the built transaction from the **transactionBuilder**
  - `endpoint` is the HTTP URL to a ArchEthic node (acting as welcome node)
  
  ```js
  const archethic = require('archethic')
  tx = ...
  archethic.sendTransaction(tx, "http://www.archethic.net")
  ```


  #### getTransactionIndex(address, endpoint)
  Query a node to find the length of the chain to retrieve the transaction index
  
  - `address` Transaction address (in hexadecimal)
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getTransactionIndex("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "https://www.archethic.net")
  // 0
  ```

  #### getLastTransaction(address, endpoint)
  Query a node to find the last transaction of a chain
  
  - `address` Transaction address (in hexadecimal)
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getLastTransaction("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "https://www.archethic.net")
  ```
  <details>
  <summary>Object returned</summary>

  ```JSON
  {
    "address": "",
    "chainLength": 1,
    "type": "",
    "data": {
      "content": "",
      "ledger": {
        "nft": {
          "transfers": [
            {
              "amount": 1,
              "to": "",
              "nft": ""
            }
          ]
        },
        "uco": {
          "transfers": [
            {
              "amount": 1,
              "to": ""
            }
          ]
        }
      }
    },
    "inputs": [
      {
        "amount": 1,
        "from": "",
        "nftAddress": "",
        "timestamp": 1,
        "type": ""
      }
    ],
    "validationStamp": {
      "ledgerOperations": {
        "fee": 1
      },
      "timestamp": 1
    }
  }
  ```
  </details>


  #### getTransactionChain(address, endpoint)
  Query a node to find all transactions of a chain (sorted by most recent)

  Result is paginated by 10 transactions, page 1 is the most recent transaction
  
  - `address` Transaction address (in hexadecimal)
  - `page` Page number
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getTransactionChain("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",  1, "https://www.archethic.net")
  // 0
  ```

  <details>
  <summary>Object returned</summary>

  Array of :
  ```JSON
  {
    "address": "",
    "chainLength": 1,
    "type": "",
    "data": {
      "content": "",
      "ledger": {
        "nft": {
          "transfers": [
            {
              "amount": 1,
              "to": "",
              "nft": ""
            }
          ]
        },
        "uco": {
          "transfers": [
            {
              "amount": 1,
              "to": ""
            }
          ]
        }
      }
    },
    "inputs": [
      {
        "amount": 1,
        "from": "",
        "nftAddress": "",
        "timestamp": 1,
        "type": ""
      }
    ],
    "validationStamp": {
      "ledgerOperations": {
        "fee": 1
      },
      "timestamp": 1
    }
  }
  ```
  </details>


  #### getLastAddressBalance(address, endpoint)
  Query a node to find the last balance of an address
  
  - `address` Transaction address (in hexadecimal)
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getLastAddressBalance("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "https://www.archethic.net")
  // 0
  ```

  <details>
  <summary>Object returned</summary>


  ```JSON
  {
    "uco": 1,
    "nft": [
      {
        "address": "",
        "amount": 1
      }
    ]
  }
  ```
  </details>


  #### getStorageNoncePublicKey(endpoint)
  Query a node to find the public key of the shared storage node key
  
  - `endpoint` Node endpoint

  ```js
  const archethic = require('archethic')
  const index = archethic.getStorageNoncePublicKey("http://www.archethic.net")
  // 00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646
  ```


## Running the tests

```bash
npm test
```

## Licence

AGPL3
