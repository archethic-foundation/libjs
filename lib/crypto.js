import { createHash, createHmac, createECDH, createCipheriv, randomBytes, createDecipheriv} from 'crypto'

import elliptic from 'elliptic'

import sha3 from 'js-sha3';
import blake2b from 'blake2b';
import * as curve25519 from 'curve25519-js'
import ed2curve from 'ed2curve'

import { isHex, hexToUint8Array, concatUint8Arrays, encodeInt32 } from './utils.js';

const { ec: EC, eddsa: EdDSA } = elliptic 

const ec_eddsa = new EdDSA("ed25519")
const ec_P256 = new EC("p256")
const ec_secp256k1 = new EC("secp256k1")

const { sha3_512, sha3_256 } = sha3

const SOFTWARE_ID = 1

/**
 * Generate a random secret key of 32 bytes
 */
export function randomSecretKey() {
  return new Uint8Array(randomBytes(32))
}

/**
 * Get the ID of a given hash algorithm
 * @params {String} hashAlgo Hash algorithm
 */
export function hashAlgoToID(hashAlgo) {
  switch(hashAlgo) {
    case "sha256":
      return 0
    case "sha512":
      return 1
    case "sha3-256":
      return 2
    case "sha3-512":
      return 3
    case "blake2b":
      return 4
    default:
      throw "Hash algorithm not supported"
  }
}

/**
 * Get the hash algo name from the hash algorithm ID
 * @param {Integer} ID Hash algorithm's ID
 */
export function IDToHashAlgo(ID) {
  switch (ID) {
    case 0:
      return "sha256"
    case 1:
      return "sha512"
    case 2:
      return "sha3-256"
    case 3:
      return "sha3-512"
    case 4:
      return "blake2b"
    default:
      throw "Hash algorithm ID not supported"
  }
}

/**
 * Get the ID of a given Elliptic curve
 * @params {String} curve Elliptic curve
 */
export function curveToID(curve) {
  switch(curve) {
    case "ed25519":
      return 0;

    case "P256":
      return 1;

    case "secp256k1":
      return 2;

    default :
      throw "Curve not supported"
  }
}

/**
 * Get the curve name from the curve ID
 * @param {Integer} ID Curve's ID
 */
export function IDToCurve(ID) {
  switch (ID) {
    case 0:
      return "ed25519"
    case 1:
      return "P256"
    case 2:
      return "secp256k1"
    default:
      throw "Curve ID not supported"
  }
}

/**
 * Create an address from a seed, an index, an elliptic curve and an hash algorithm.
 * The address is prepended by the curve identification, the hash algorithm and the digest of the address
 * 
 * @param {String} seed Keypair derivation seed
 * @param {Integer} index Number to identify the order of keys to generate
 * @param {String} curve Elliptic Curves(ed25519, P256, secp256k1)
 * @param {String} algo Hash algorithm ("sha256", "sha512", "sha3-256", "sha3-512", "blake2b")
 */
export function deriveAddress(seed, index, curve = "ed25519", hashAlgo = "sha256") {
  const { publicKey } = deriveKeyPair(seed, index, curve)

  const curveID = curveToID(curve)
  const hashedPublicKey = hash(publicKey, hashAlgo)

  return concatUint8Arrays(
    [
      Uint8Array.from([curveID]),
      Uint8Array.from(hashedPublicKey)
    ]
  )
}

/**
 * Create a hash digest from the data with an hash algorithm identification prepending the digest
 * @param {String | Uint8Array} content Data to hash (string or buffer)
 * @param {String} algo Hash algorithm ("sha256", "sha512", "sha3-256", "sha3-512", "blake2b")
 */
export function hash(content, algo = "sha256") {
  if (typeof(content) !== "string" && !(content instanceof Uint8Array)) {
    throw "'content' must be a string or Uint8Array"
  }

  if (typeof(content) == "string") {
    if(isHex(content)) {
      content = hexToUint8Array(content)
    } else {
      content = new TextEncoder().encode(content)
    }
  }

  const algoID = hashAlgoToID(algo)
  const digest = getHashDigest(content, algo)

  return concatUint8Arrays([
    Uint8Array.from([algoID]),
    Uint8Array.from(digest)
  ])
}

export function getHashDigest(content, algo) {
  switch(algo) {
    case "sha256": {
      const hash = createHash(algo);
      hash.update(content);
      return hash.digest()
    }
    case "sha512": {
      const hash = createHash(algo);
      hash.update(content);
      return hash.digest()
    }
    case "sha3-256": {
      const hash = sha3_256.create();
      hash.update(content)
      return hash.digest()
    }
    case "sha3-512": {
      const hash = sha3_512.create()
      hash.update(content)
      return hash.digest()
    }
    case "blake2b": {
      const output = new Uint8Array(64)
      const hash = blake2b(64)
      hash.update(content)
      hash.digest(output)
      return output
    }
    default:
      throw "Hash algorithm not supported"
  }
}
/**
 * Generate a keypair using a derivation function with a seed and an index. Each keys is prepending with a curve identification.
 * @param {String} seed Keypair derivation seed
 * @param {Integer} index Number to identify the order of keys to generate
 * @param {String} curve Elliptic curve to use ("ed25519", "P256", "secp256k1")
 */
export function deriveKeyPair(seed, index, curve = "ed25519") {

  if (typeof(seed) !== "string" && !(seed instanceof Uint8Array)) {
    throw "'seed must be a string"
  }

  if (typeof index !== 'number' || index < 0) {
    throw "'index' must be a positive number"
  }

  const pvBuf = derivePrivateKey(seed, index)
  return generateDeterministicKeyPair(pvBuf, curve, SOFTWARE_ID)
}

/**
 * Generate a new keypair deterministically with a given private key, curve and origin id
 * @params {Uint8Array} privateKey Private key
 * @params {String} curve Elliptic curve
 * @params {Integer} originID Origin identification
 */
export function generateDeterministicKeyPair(pvKey, curve, originID) {

  const curveID = curveToID(curve)
  const { publicKey, privateKey } = getKeypair(pvKey, curve)

  return {
    privateKey: concatUint8Arrays([
      Uint8Array.from([curveID]),
      Uint8Array.from([originID]),
      privateKey
    ]),
    publicKey: concatUint8Arrays([
      Uint8Array.from([curveID]),
      Uint8Array.from([originID]),
      publicKey
    ])
  }
}

function getKeypair(pvKey, curve) {
  switch (curve) {
    case "ed25519": {
      const key = ec_eddsa.keyFromSecret(pvKey)
      const pubBuf = new Uint8Array(key.pubBytes())

      return {
        privateKey: pvKey,
        publicKey: pubBuf
      }
    }
    case "P256": {
      const key = ec_P256.keyFromPrivate(pvKey)
      const pubBuf = hexToUint8Array(key.getPublic().encode("hex"))
      return {
        privateKey: pvKey,
        publicKey: pubBuf
      }
    }
    case "secp256k1": {
      const key = ec_secp256k1.keyFromPrivate(pvKey)
      const pubBuf = hexToUint8Array(key.getPublic().encode("hex"))
      return {
        privateKey: pvKey,
        publicKey: pubBuf
      }
    }
    default:
      throw "Curve not supported"
  }
}

/**
 * Sign the data 
 * @param {String | Uint8Array} data Data to sign
 * @param {String | Uint8Array} privateKey Private key to use to sign the data
 */
export function sign(data, privateKey) {

  if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
    throw "'data' must be a string or Uint8Array"
  }

  if (typeof(privateKey) !== "string" && !(privateKey instanceof Uint8Array)) {
    throw "'privateKey' must be a string or an Uint8Array"
  }

  if (typeof(data) == "string") {
    if(isHex(data)) {
      data = hexToUint8Array(data)
    } else {
      data = new TextEncoder().encode(data)
    }
  }

  if (typeof(privateKey) == "string") {
    if(isHex(privateKey)) {
      privateKey = hexToUint8Array(privateKey)
    } else {
      throw "'privateKey' must be an hexadecimal string"
    }
  }

  const curveBuf = privateKey.slice(0, 1)
  const pvBuf = privateKey.slice(2, privateKey.length)

  switch (curveBuf[0]) {
    case 0: {
      const key = ec_eddsa.keyFromSecret(pvBuf)
      return Uint8Array.from(key.sign(data).toBytes())
    }
    case 1: {
      const msgHash = createHash("sha256")
      .update(data)
      .digest()

      const key = ec_P256.keyFromPrivate(pvBuf)
      return Uint8Array.from(key.sign(msgHash).toDER())
    }
    case 2: {
      const msgHash = createHash("sha256")
      .update(data)
      .digest()

      const key = ec_secp256k1.keyFromPrivate(pvBuf)
      return Uint8Array.from(key.sign(msgHash).toDER())
    }
    default:
      throw "Curve not supported"
  }
}

export function verify(sig, data, publicKey) {
  if (typeof(sig) !== "string" && !(sig instanceof Uint8Array)) {
    throw "'signature' must be a string of Uint8Array"
  }

  if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
    throw "'data' must be a string or Uint8Array"
  }

  if (typeof(publicKey) !== "string" && !(publicKey instanceof Uint8Array)) {
    throw "'publicKey' must be a string or Uint8Array"
  }

  if (typeof(sig) == "string") {
    if (isHex(sig)) {
      sig = hexToUint8Array(sig)
    } else {
      throw "'signature' must be an hexadecimal string"
    }
  }

  if (typeof(data) == "string") {
    if(isHex(data)) {
      data = hexToUint8Array(data)
    } else {
      data = new TextEncoder().encode(data)
    }
  }

  if (typeof(publicKey) == "string") {
    if(isHex(publicKey)) {
      publicKey = hexToUint8Array(publicKey)
    } else {
      throw "'publicKey' must be an hexadecimal string"
    }
  }

  const curveBuf = publicKey.slice(0, 1)
  const pubBuf = publicKey.slice(2, publicKey.length)
  switch (curveBuf[0]) {
    case 0: {
      const key = ec_eddsa.keyFromPublic(Array.from(pubBuf))
      return key.verify(data, Array.from(sig))
    }
    case 1: {
      const msgHash = createHash("sha256")
      .update(data)
      .digest()

      const key = ec_P256.keyFromPublic(pubBuf)
      return key.verify(msgHash, sig)
    }
    case 2:  {
      const msgHash = createHash("sha256")
      .update(data)
      .digest()

      const key = ec_secp256k1.keyFromPublic(pubBuf)
      return key.verify(msgHash, sig)
    }
    default:
      throw "Curve not supported"
  } 
}

/**
 * Encrypt a data for a given public key using ECIES algorithm
 * @param {String | Uint8Array} data Data to encrypt
 * @param {String | Uint8Array} publicKey Public key for the shared secret encryption
 */
export function ecEncrypt(data, publicKey) {

  if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
    throw "'data' must be a string or Uint8Array"
  }

  if (typeof(publicKey) !== "string" && !(publicKey instanceof Uint8Array)) {
    throw "'publicKey' must be a string or Uint8Array"
  }

  if (typeof(data) == "string") {
    if(isHex(data)) {
      data = hexToUint8Array(data)
    } else {
      data = new TextEncoder().encode(data)
    }
  }

  if (typeof(publicKey) == "string") {
    if(isHex(publicKey)) {
      publicKey = hexToUint8Array(publicKey)
    } else {
      throw "'publicKey' must be an hexadecimal string"
    }
  }

  const curve_buf = publicKey.slice(0, 1)
  const pubBuf = publicKey.slice(2, publicKey.length)

  switch (curve_buf[0]) {
    case 0: {
      const { public: ephemeralPublicKey, private: ephemeralPrivateKey} = curve25519.generateKeyPair(randomBytes(32))  
      const curve25519pub = ed2curve.convertPublicKey(pubBuf)

      const sharedKey = curve25519.sharedKey(ephemeralPrivateKey, curve25519pub)
      const { aesKey, iv } = deriveSecret(sharedKey)

      const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv)

      return concatUint8Arrays([
        Uint8Array.from(ephemeralPublicKey),
        tag,
        encrypted
      ])
    }
    case 1: {
      const ecdh = createECDH("prime256v1")
      ecdh.generateKeys(); 
      const sharedKey = ecdh.computeSecret(pubBuf)

      const { aesKey, iv } = deriveSecret(sharedKey)
      const { tag, encrypted} = aesAuthEncrypt(data, aesKey, iv)

      return concatUint8Arrays([
        Uint8Array.from(ecdh.getPublicKey()),
        tag,
        encrypted
      ])
    }
    case 2:  {
      const ecdh = createECDH("secp256k1")
      ecdh.generateKeys(); 
      const sharedKey = ecdh.computeSecret(pubBuf)

      const { aesKey, iv } = deriveSecret(sharedKey)

      const { tag, encrypted} = aesAuthEncrypt(data, aesKey, iv)

      return concatUint8Arrays([
        Uint8Array.from(ecdh.getPublicKey()),
        tag,
        encrypted
      ])
    }
    default:
      throw "Curve not supported"
  }
}

/**
 * Decrypt a ciphertext for a given private key using ECIES algorithm
 * @param {String | Uint8Array} ciphertext Ciphertext to decrypt
 * @param {String | Uint8Array} privateKey Private key for the shared secret encryption
 */
export function ecDecrypt(ciphertext, privateKey) {

  if (typeof(ciphertext) !== "string" && !(ciphertext instanceof Uint8Array)) {
    throw "'ciphertext' must be a string or Uint8Array"
  }

  if (typeof(privateKey) !== "string" && !(privateKey instanceof Uint8Array)) {
    throw "'privateKey' must be a string or Uint8Array"
  }

  if (typeof(ciphertext) == "string") {
    if(isHex(ciphertext)) {
      ciphertext = hexToUint8Array(ciphertext)
    } else {
      throw "'ciphertext' must be an hexadecimal string"
    }
  }

  if (typeof(privateKey) == "string") {
    if(isHex(privateKey)) {
      privateKey = hexToUint8Array(privateKey)
    } else {
      throw "'privateKey' must be an hexadecimal string"
    }
  }

  const curve_buf = privateKey.slice(0, 1)
  const pvBuf = privateKey.slice(2, privateKey.length)

  switch (curve_buf[0]) {
    case 0: {
      const ephemeralPubKey = ciphertext.slice(0, 32)
      const tag = ciphertext.slice(32, 32+16)
      const encrypted = ciphertext.slice(32+16, ciphertext.length)

      const curve25519pv = ed2curve.convertSecretKey(pvBuf)

      const sharedKey = curve25519.sharedKey(curve25519pv, ephemeralPubKey)
      const { aesKey, iv } = deriveSecret(sharedKey)

      return aesAuthDecrypt(encrypted, aesKey, iv, tag)
    }
    case 1: {
      const ephemeralPubKey = ciphertext.slice(0, 65)
      const tag = ciphertext.slice(65, 65+16)
      const encrypted = ciphertext.slice(65+16, ciphertext.length)

      const ecdh = createECDH("prime256v1")
      ecdh.setPrivateKey(pvBuf)
      const sharedKey = ecdh.computeSecret(ephemeralPubKey)
      const { aesKey, iv } = deriveSecret(sharedKey)

      return aesAuthDecrypt(encrypted, aesKey, iv, tag)
    }
    case 2: {
      const ephemeralPubKey = ciphertext.slice(0, 65)
      const tag = ciphertext.slice(65, 65+16)
      const encrypted = ciphertext.slice(65+16, ciphertext.length)

      const ecdh = createECDH("secp256k1")
      ecdh.setPrivateKey(pvBuf)
      const sharedKey = ecdh.computeSecret(ephemeralPubKey)
      const { aesKey, iv } = deriveSecret(sharedKey)

      return aesAuthDecrypt(encrypted, aesKey, iv, tag)
    }
    default:
      throw "Curve not supported"
  }
}

/**
 * Encrypt a data for a given public key using AES algorithm
 * @param {String | Uint8Array} data Data to encrypt
 * @param {String | Uint8Array} key Symmetric key
 */
export function aesEncrypt(data, key) {
  if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
    throw "'data' must be a string or Uint8Array"
  }

  if (typeof(key) !== "string" && !(key instanceof Uint8Array)) {
    throw "'key' must be a string or Uint8Array"
  }

  if (typeof(data) == "string") {
    if(isHex(data)) {
      data = hexToUint8Array(data)
    } else {
      data = new TextEncoder().encode(data)
    }
  }

  if (typeof(key) == "string") {
    if(isHex(key)) {
      key = hexToUint8Array(key)
    } else {
      throw "'key' must be an hexadecimal string"
    }
  }

  const iv = randomBytes(12)

  const { tag: tag, encrypted: encrypted} = aesAuthEncrypt(data, key, iv)

  const ciphertext = concatUint8Arrays([
    new Uint8Array(iv),
    tag,
    encrypted
  ])

  return ciphertext
}

export function aesDecrypt(cipherText, key) {

  if (typeof(cipherText) !== "string" && !(cipherText instanceof Uint8Array)) {
    throw "'cipherText' must be a string or Uint8Array"
  }

  if (typeof(key) !== "string" && !(key instanceof Uint8Array)) {
    throw "'key' must be a string or Uint8Array"
  }

  if (typeof(cipherText) == "string") {
    if(isHex(cipherText)) {
      cipherText = hexToUint8Array(cipherText)
    } else {
      throw "'cipherText' must be an hexadecimal string"
    }
  }

  if (typeof(key) == "string") {
    if(isHex(key)) {
      key = hexToUint8Array(key)
    } else {
      throw "'key' must be an be hexadecimal string"
    }
  }

  const iv = cipherText.slice(0, 12)
  const tag = cipherText.slice(12, 12 + 16)
  const encrypted = cipherText.slice(28, cipherText.length)

  return aesAuthDecrypt(encrypted, key, iv, tag)
}


function derivePrivateKey(seed, index) {

  if (isHex(seed)) {
    seed = hexToUint8Array(seed)
  }

  //Derive master keys
  const hash = createHash("sha512")
    .update(seed)
    .digest()

  const masterKey = hash.subarray(0, 32)
  const masterEntropy = hash.subarray(32, 64)

  //Derive the final seed
  const index_buf = encodeInt32(index)
  const extended_seed = concatUint8Arrays([masterKey, index_buf])

  const hmac = createHmac('sha512', masterEntropy)
    .update(extended_seed)
    .digest()

  // The first 32 bytes become the next private key
  return hmac.subarray(0, 32)
}

function deriveSecret(sharedKey) {

  if (typeof(sharedKey) !== "string" && !(sharedKey instanceof Uint8Array)) {
    throw "'sharedKey' must be a string or Uint8Array"
  }

  if (typeof(sharedKey) == "string") {
    if(isHex(sharedKey)) {
      sharedKey = hexToUint8Array(sharedKey)
    } else {
      throw "'sharedKey' must be an hexadecimal string"
    }
  }

  const pseudoRandomKey = createHash("sha256")
    .update(sharedKey)
    .digest()

  const iv = createHmac("sha256", pseudoRandomKey)
    .update("0")
    .digest()
    .subarray(0, 32)

  const aesKey = createHmac("sha256", iv)
    .update("1")
    .digest()
    .subarray(0, 32)

  return {
    iv,
    aesKey
  }
}

function aesAuthEncrypt(data, aesKey, iv) {
  let cipher = createCipheriv("aes-256-gcm", aesKey, iv)

  let encrypted = cipher.update(data)
  encrypted = concatUint8Arrays([ encrypted, cipher.final()])

  return { tag: new Uint8Array(cipher.getAuthTag()), encrypted: encrypted }
}

function aesAuthDecrypt(encrypted, aesKey, iv, tag) {
  let decipher = createDecipheriv("aes-256-gcm", aesKey, iv)
  decipher.setAuthTag(tag)
  
  let decryptedBuffers = [decipher.update(encrypted)]
  decryptedBuffers.push(decipher.final())
  
  return concatUint8Arrays(decryptedBuffers)
}
