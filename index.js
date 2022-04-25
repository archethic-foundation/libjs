const TxBuilder = require('./lib/transaction_builder')
const API = require('./lib/api')
const Crypto = require('./lib/crypto')
const { newKeychain, toDID } = require("./lib/keychain")
const { uint8ArrayToHex } = require('./lib/utils')
const { randomBytes } = require("crypto")

module.exports.newTransactionBuilder = newTransactionBuilder
module.exports.newKeychainTransaction = newKeychainTransaction
module.exports.newAccessKeychainTransaction = newAccessKeychainTransaction

module.exports.deriveKeyPair = deriveKeyPair
module.exports.deriveAddress = deriveAddress
module.exports.ecEncrypt = ecEncrypt
module.exports.ecDecrypt = ecDecrypt
module.exports.aesEncrypt = aesEncrypt
module.exports.aesDecrypt = aesDecrypt

module.exports.sendTransaction = sendTransaction
module.exports.waitConfirmations = waitConfirmations
module.exports.getTransactionIndex = getTransactionIndex
module.exports.getTransactionFee = getTransactionFee
module.exports.getStorageNoncePublicKey = getStorageNoncePublicKey

/**
 * Create a new TransactionBuilder instance to forge transaction
 * @param {String} type Transaction type ("identity", "keychain", "transfer", "hosting", "code_proposal", "code_approval", "nft")
 */
function newTransactionBuilder(type) {
    return new TxBuilder(type)
}

/**
 * Send the transaction to a node
 * @param {Object} tx Transaction to send
 * @param {String} endpoint Node endpoint
 */
function sendTransaction(tx, endpoint) {
    return API.sendTx(tx, endpoint)
}

/**
 * Await the transaction confirmations
 * @param {String | Uint8Arrray} address Address to await
 * @param {String} endpoint Node endpoint
 * @param {Function} handler Success handler
 */
function waitConfirmations(address, endpoint, handler) {

    if (typeof (address) == "string") {
        if (!isHex(address)) {
            throw "'address' must be in hexadecimal form if it's string"
        }
    }

    if (address instanceof Uint8Array) {
        address = uint8ArrayToHex(address)
    }

    if (!(handler instanceof Function)) {
        throw "'handler' must be a function"
    }

    API.waitConfirmations(address, endpoint, handler)
}

/**
 * Derive a keypair
 * @param {String} seed TransactionChain seed
 * @param {Integer} index Number of transaction in the chain
 * @param {String} curve  Elliptic curve to use ("ed25519", "P256", "secp256k1")
 */
function deriveKeyPair(seed, index, curve = "ed25519") {
    const { privateKey, publicKey } = Crypto.deriveKeyPair(seed, index, curve)
    return {
        privateKey: uint8ArrayToHex(privateKey),
        publicKey: uint8ArrayToHex(publicKey)
    }
}

/**
 * Derive an address
 * @param {String} seed TransactionChain seed
 * @param {Integer} index Number of transaction in the chain
 * @param {String} curve  Elliptic curve to use ("ed25519", "P256", "secp256k1")
 * @param {String} hashAlgo  Hash algorithm ("sha256", "sha512", "sha3-256", "sha3-512", "blake2b")
 */
function deriveAddress(seed, index, curve = "ed25519", hashAlgo = "sha256") {
    return uint8ArrayToHex(Crypto.deriveAddress(seed, index, curve, hashAlgo))
}

/**
 * Encrypt a data for a given public key using ECIES algorithm
 * @param {String | Uint8Array} data Data to encrypt
 * @param {String | Uint8Array} publicKey Public key for the shared secret encryption
 */
function ecEncrypt(data, publicKey) {
    const ciphertext = Crypto.ecEncrypt(data, publicKey)
    return uint8ArrayToHex(ciphertext)
}

/**
* Decrypt a ciphertext for a given private key using ECIES algorithm
* @param {String | Uint8Array} ciphertext Ciphertext to decrypt
* @param {String | Uint8Array} privateKey Private key for the shared secret encryption
*/
function ecDecrypt(ciphertext, privateKey) {
    const data = Crypto.ecDecrypt(ciphertext, privateKey)
    return data
}

/**
 * Encrypt a data for a given public key using AES algorithm
 * @param {String | Uint8Array} data Data to encrypt
 * @param {String | Uint8Array} key Symmetric key
 */
function aesEncrypt(data, key) {
    const ciphertext = Crypto.aesEncrypt(data, key)
    return uint8ArrayToHex(ciphertext)
}

/**
 * Decrypt a ciphertext using AES algorithm
 * @param {String | Uint8Array} ciphertext Ciphertext to decrypt
 * @param {String | Uint8Array} key key
 */

function aesDecrypt(cipherText, key) {
    const data = Crypto.aesDecrypt(cipherText, key)
    return data
}

/**
 * Retrieve the index of transaction in a specific chain. (aka. the number of transaction on the chain)
 * @param {String} address Transaction address
 * @param {String} endpoint Node endpoint
 */
function getTransactionIndex(address, endpoint) {
    return API.getTransactionIndex(address, endpoint)
}

/**
 * Generate a random secret key of 32 bytes
 */
function randomSecretKey() {
    return new Uint8Array(randomBytes(32))
}

/**
 * Retrieve the storage nonce public key to encrypt data towards nodes
 * @param {String} endpoint Node endpoint
 */
function getStorageNoncePublicKey(endpoint) {
    return API.getStorageNoncePublicKey(endpoint)
}

/**
 * Request transaction fee from the endpoint for the given transaction
 * @param {Object} tx Transaction to send
 * @param {String} endpoint Node endpoint
 */
function getTransactionFee(tx, endpoint) {
  return API.getTransactionFee(tx, endpoint)
}

/**
* Create a new keychain and build a transaction
* @param {Uint8Array | String} seed Keychain's seed
* @param {Array} authorizedPublicKeys List of authorized public keys able to decrypt the keychain
* @param {UintArray} originPrivateKey Origin private key to attest the transaction
*/
function newKeychainTransaction(seed, authorizedPublicKeys, originPrivateKey) {
  const keychain = newKeychain(seed)
  
  const aesKey = randomSecretKey()

  const authorizedKeys = authorizedPublicKeys.map(key => {
    return {
      publicKey: key,
      encryptedSecretKey: ecEncrypt(aesKey, key)
    }
  })

  return newTransactionBuilder("keychain")
    .setContent(JSON.stringify(toDID(keychain)))
    .addOwnership(aesEncrypt(JSON.stringify(keychain), aesKey), authorizedKeys)
    .build(seed, 0)
    .originSign(originPrivateKey)
}

/**
* Create a new access keychain and build a transaction
* @param {Uint8Array | String} seed Access keychain's seed
* @param {Uint8Array} keychainAddress Keychain's transaction address 
* @param {UintArray} originPrivateKey Origin private key to attest the transaction
*/
function newAccessKeychainTransaction(seed, keychainAddress, originPrivateKey) {
  const aesKey = randomSecretKey()

  const { publicKey} = deriveKeyPair(seed, 0)
  
  encryptedSecretKey = ecEncrypt(aesKey, publicKey)
  
  const authorizedKeys = [
    {
      publicKey: publicKey,
      encryptedSecretKey: encryptedSecretKey
    }
  ]
  
  return newTransactionBuilder("keychain_access")
    .addOwnership(aesEncrypt(keychainAddress, aesKey), authorizedKeys)
    .build(seed, 0)
    .originSign(originPrivateKey)
}