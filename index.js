const TxBuilder = require('./lib/transaction_builder')
const TxSender = require('./lib/transaction_sender')
const API = require('./lib/api')
const Crypto = require('./lib/crypto')
const Utils = require('./lib/utils')
const { newKeychain, decodeKeychain } = require("./lib/keychain")
const { randomBytes } = require("crypto")

module.exports.newTransactionBuilder = newTransactionBuilder
module.exports.newTransactionSender = newTransactionSender
module.exports.newKeychainTransaction = newKeychainTransaction
module.exports.newAccessKeychainTransaction = newAccessKeychainTransaction

module.exports.getKeychain = getKeychain

module.exports.deriveKeyPair = deriveKeyPair
module.exports.deriveAddress = deriveAddress
module.exports.ecEncrypt = ecEncrypt
module.exports.ecDecrypt = ecDecrypt
module.exports.aesEncrypt = aesEncrypt
module.exports.aesDecrypt = aesDecrypt
module.exports.randomSecretKey = randomSecretKey

module.exports.getTransactionIndex = getTransactionIndex
module.exports.getTransactionFee = getTransactionFee
module.exports.getStorageNoncePublicKey = getStorageNoncePublicKey
module.exports.getTransactionOwnerships = getTransactionOwnerships
module.exports.getOriginKey = getOriginKey
module.exports.addOriginKey = addOriginKey
module.exports.getLastOracleData = getLastOracleData
module.exports.getOracleDataAt = getOracleDataAt
module.exports.subscribeToOracleUpdates = subscribeToOracleUpdates

module.exports.fromBigInt = fromBigInt

/**
 * Create a new TransactionBuilder instance to forge transaction
 * @param {String} type Transaction type ("identity", "keychain", "transfer", "hosting", "code_proposal", "code_approval", "nft")
 */
function newTransactionBuilder(type) {
    return new TxBuilder(type)
}

/**
 * Create a new TransactionBuilder instance to forge transaction
 * @param {String} type Transaction type ("identity", "keychain", "transfer", "hosting", "code_proposal", "code_approval", "nft")
 */
 function newTransactionSender(tx, endpoint) {
  return new TxSender(tx, endpoint)
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
        privateKey: Utils.uint8ArrayToHex(privateKey),
        publicKey: Utils.uint8ArrayToHex(publicKey)
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
    return Utils.uint8ArrayToHex(Crypto.deriveAddress(seed, index, curve, hashAlgo))
}

/**
 * Encrypt a data for a given public key using ECIES algorithm
 * @param {String | Uint8Array} data Data to encrypt
 * @param {String | Uint8Array} publicKey Public key for the shared secret encryption
 */
function ecEncrypt(data, publicKey) {
    const ciphertext = Crypto.ecEncrypt(data, publicKey)
    return Utils.uint8ArrayToHex(ciphertext)
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
    return Utils.uint8ArrayToHex(ciphertext)
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
    .setContent(JSON.stringify(keychain.toDID()))
    .addOwnership(aesEncrypt(keychain.encode(), aesKey), authorizedKeys)
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

/**
* Retrieve a keychain by using keychain access seed
* @param {Uint8Array | String} seed Keychain's access seed
* @param {String} endpoint Node endpoint
*/
function getKeychain(seed, endpoint) {

  const { publicKey: accessPublicKey, privateKey: accessPrivateKey} = deriveKeyPair(seed, 0)
  const accessKeychainAddress = deriveAddress(seed, 1)
  return new Promise((resolve, reject) => {
     
    return API.getTransactionOwnerships(accessKeychainAddress, endpoint).then(ownerships => {
      if (ownerships.length == 0) {
        return reject("Keychain doesn't exists")
      }
   
      const { secret: secret, authorizedPublicKeys: authorizedPublicKeys } = ownerships[0]
      const { encryptedSecretKey } = authorizedPublicKeys.find(authKey => {
        return authKey.publicKey.toLocaleUpperCase() == accessPublicKey.toLocaleUpperCase()
      })

      const aesKey = ecDecrypt(encryptedSecretKey, accessPrivateKey)
      const keychainAddress = aesDecrypt(secret, aesKey)
    
      return API.getTransactionOwnerships(Utils.uint8ArrayToHex(keychainAddress), endpoint).then(ownerships => {
        const { secret: secret, authorizedPublicKeys: authorizedKeys } = ownerships[0]
        const { encryptedSecretKey } = authorizedKeys.find(({publicKey }) => publicKey.toUpperCase() == accessPublicKey.toUpperCase())
    
        const aesKey = ecDecrypt(encryptedSecretKey, accessPrivateKey)
        const keychain = aesDecrypt(secret, aesKey)
        
        resolve(decodeKeychain(keychain))
      })
    })
 })
}

/**
 * Get the list the ownerships of a given transaction's address
 * @param {String} address Transaction's address
 * @param {String} endpoint Node endpoint
 */
function getTransactionOwnerships(address, endpoint) {
  return API.getTransactionOwnerships(address, endpoint)
}

/**
 * Return the origin private keys
 */
function getOriginKey() {
  return Utils.ORIGIN_PRIVATE_KEY
}

/**
 * Add a new origin key
 * @param {String} originPublicKey origin public key to be added
 * @param {String} certificate certificate of the origin public key
 * @param {String} endpoint Node endpoint
 */
function addOriginKey(originPublicKey, certificate, endpoint) {
  return API.addOriginKey(originPublicKey, certificate, endpoint)
}

/**
 * Convert a big int number of 10^8 decimals into a decimal
 * @param {Integer} number number to convert
 */
function fromBigInt(number) {
  return Utils.fromBigInt(number)
}

/**
 * Get the latest OracleChain data
 * @param {String} endpoint Node endpoint
 */
 function getLastOracleData(endpoint) {
  return API.getLastOracleData(endpoint)
}

/**
 * Get the OracleChain data at a given time
 * @param {Integer} timestamp Unix timestamp
 * @param {String} endpoint Node endpoint
 */
function getOracleDataAt(timestamp, endpoint) {
  return API.getOracleDataAt(timestamp, endpoint)
}

/**
 * Subscribe to get the OracleChain in real time
 * @param {String} endpoint Node endpoint
 * @param {Function} handler Callback function which will receive the OracleChain data
 */
function subscribeToOracleUpdates(endpoint, handler) {
  return API.subscribeToOracleUpdates(endpoint, handler)
}