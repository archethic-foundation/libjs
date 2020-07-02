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

  - newTransactionBuilder: create a new instance of the transaction builder
  
  ```js
  const uniris = require('uniris-libjs')
  tx = uniris.newTransactionBuilder("transfer") // Define the transaction type "transfer"
    .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.420) 
    .build(seed, 0, originPrivateKey) // Serialize the transaction using a custom binary protocol
  ```
  
  - sendTransaction: send the transaction to a node by serialiazing a GraphQL request
  ```js
  const uniris = require('uniris-libjs')
  tx = ...
  uniris.sendTransaction(tx, "https://blockchain.uniris.io")
  ```
  
    
  - ecEncrypt: make an ECIES encryption using a public key and a data
  ```js
  const uniris = require('uniris-libjs')
  uniris.ecEncrypt("dataToEncrypt", "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
  ```

## Running the tests

```bash
npm test
```
