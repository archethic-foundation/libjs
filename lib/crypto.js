import CryptoJS from 'crypto-js';
import sjcl from "sjcl";

import sha3 from 'js-sha3';
import blake from 'blakejs';
import * as curve25519 from 'curve25519-js'
import ed2curve from 'ed2curve'
import nacl from "tweetnacl"
import elliptic from "elliptic"

import { hexToUint8Array, concatUint8Arrays, encodeInt32, maybeHexToUint8Array, maybeStringToUint8Array, uint8ArrayToHex, wordArrayToUint8Array } from './utils.js';

const { sha3_512, sha3_256 } = sha3

const EC = elliptic.ec
const ec_P256 = new EC("p256")
const ec_secp256k1 = new EC("secp256k1")
const SOFTWARE_ID = 1

/**
 * Generate a random secret key of 32 bytes
 */
export function randomSecretKey() {
  return wordArrayToUint8Array(CryptoJS.lib.WordArray.random(32))
}

/**
 * Get the ID of a given hash algorithm
 * @params {String} hashAlgo Hash algorithm
 */
export function hashAlgoToID(hashAlgo) {
  switch (hashAlgo) {
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
  switch (curve) {
    case "ed25519":
      return 0;

    case "P256":
      return 1;

    case "secp256k1":
      return 2;

    default:
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
  content = maybeStringToUint8Array(content)

  const algoID = hashAlgoToID(algo)
  const digest = getHashDigest(content, algo)

  return concatUint8Arrays([
    Uint8Array.from([algoID]),
    Uint8Array.from(digest)
  ])
}

export function getHashDigest(content, algo) {
  switch (algo) {
    case "sha256": {
      const input = CryptoJS.lib.WordArray.create(content)
      const digest = CryptoJS.SHA256(input)
      return wordArrayToUint8Array(digest)
    }
    case "sha512": {
      const input = CryptoJS.lib.WordArray.create(content)
      const digest = CryptoJS.SHA512(input)
      return wordArrayToUint8Array(digest)
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
      return blake.blake2b(content)
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

  if (typeof (seed) !== "string" && !(seed instanceof Uint8Array)) {
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
  pvKey = maybeStringToUint8Array(pvKey)
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
  // Uniform key's seed
  if (pvKey.length < 32) {
    pvKey = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(pvKey))
    pvKey = wordArrayToUint8Array(CryptoJS.SHA256(pvKey))
  }

  if (pvKey.length > 32) {
    pvKey = pvKey.subarray(0, 32)
  }

  switch (curve) {
    case "ed25519": {
      const { publicKey } = nacl.sign.keyPair.fromSeed(pvKey)

      return {
        privateKey: pvKey,
        publicKey: publicKey
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
  privateKey = maybeHexToUint8Array(privateKey)
  data = maybeStringToUint8Array(data)

  const curveBuf = privateKey.slice(0, 1)
  const pvBuf = privateKey.slice(2, privateKey.length)

  switch (curveBuf[0]) {
    case 0: {
      const { secretKey: secretKey } = nacl.sign.keyPair.fromSeed(pvBuf)
      return nacl.sign.detached(data, secretKey)
    }
    case 1: {
      data = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(data))
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data))
      const key = ec_P256.keyFromPrivate(pvBuf)
      return Uint8Array.from(key.sign(msgHash).toDER())
    }
    case 2: {
      data = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(data))
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data))
      const key = ec_secp256k1.keyFromPrivate(pvBuf)
      return Uint8Array.from(key.sign(msgHash).toDER())
    }
    default:
      throw "Curve not supported"
  }
}

export function verify(sig, data, publicKey) {
  sig = maybeHexToUint8Array(sig)
  publicKey = maybeHexToUint8Array(publicKey)
  data = maybeStringToUint8Array(data)

  const curveBuf = publicKey.slice(0, 1)
  const pubBuf = publicKey.slice(2, publicKey.length)
  switch (curveBuf[0]) {
    case 0: {
      return nacl.sign.detached.verify(data, sig, pubBuf)
    }
    case 1: {
      data = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(data))
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data))
      const key = ec_P256.keyFromPublic(pubBuf)
      return key.verify(msgHash, sig)
    }
    case 2: {
      data = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(data))
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data))
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
  publicKey = maybeHexToUint8Array(publicKey)
  data = maybeStringToUint8Array(data)

  const curve_buf = publicKey.slice(0, 1)
  const pubBuf = publicKey.slice(2, publicKey.length)

  switch (curve_buf[0]) {
    case 0: {
      const { public: ephemeralPublicKey, private: ephemeralPrivateKey } = curve25519.generateKeyPair(randomSecretKey())
      const curve25519pub = ed2curve.convertPublicKey(pubBuf)

      if (!curve25519pub) {
        throw "public key in not a valid Ed25519 public key"
      }

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
      const ecdh = ec_P256.genKeyPair()
      const pubKey = ec_P256.keyFromPublic(pubBuf).getPublic()
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray())

      const { aesKey, iv } = deriveSecret(sharedKey)
      const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv)

      return concatUint8Arrays([
        hexToUint8Array(ecdh.getPublic().encode("hex")),
        tag,
        encrypted
      ])
    }
    case 2: {
      const ecdh = ec_secp256k1.genKeyPair()
      const pubKey = ec_secp256k1.keyFromPublic(pubBuf).getPublic()
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray())

      const { aesKey, iv } = deriveSecret(sharedKey)
      const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv)

      return concatUint8Arrays([
        hexToUint8Array(ecdh.getPublic().encode("hex")),
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
  ciphertext = maybeHexToUint8Array(ciphertext)
  privateKey = maybeHexToUint8Array(privateKey)

  const curve_buf = privateKey.slice(0, 1)
  const pvBuf = privateKey.slice(2, privateKey.length)

  switch (curve_buf[0]) {
    case 0: {
      const ephemeralPubKey = ciphertext.slice(0, 32)
      const tag = ciphertext.slice(32, 32 + 16)
      const encrypted = ciphertext.slice(32 + 16, ciphertext.length)

      const curve25519pv = ed2curve.convertSecretKey(pvBuf)

      const sharedKey = curve25519.sharedKey(curve25519pv, ephemeralPubKey)
      const { aesKey, iv } = deriveSecret(sharedKey)

      return aesAuthDecrypt(encrypted, aesKey, iv, tag)
    }
    case 1: {
      const ephemeralPubKey = ciphertext.slice(0, 65)
      const tag = ciphertext.slice(65, 65 + 16)
      const encrypted = ciphertext.slice(65 + 16, ciphertext.length)

      const ecdh = ec_P256.keyFromPrivate(pvBuf)
      const pubKey = ec_P256.keyFromPublic(ephemeralPubKey).getPublic()
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray())

      const { aesKey, iv } = deriveSecret(sharedKey)

      return aesAuthDecrypt(encrypted, aesKey, iv, tag)
    }
    case 2: {
      const ephemeralPubKey = ciphertext.slice(0, 65)
      const tag = ciphertext.slice(65, 65 + 16)
      const encrypted = ciphertext.slice(65 + 16, ciphertext.length)

      const ecdh = ec_secp256k1.keyFromPrivate(pvBuf)
      const pubKey = ec_secp256k1.keyFromPublic(ephemeralPubKey).getPublic()
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray())

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
  key = maybeHexToUint8Array(key)
  data = maybeStringToUint8Array(data)

  const iv = wordArrayToUint8Array(CryptoJS.lib.WordArray.random(12))

  const { tag: tag, encrypted: encrypted } = aesAuthEncrypt(data, key, iv)

  const ciphertext = concatUint8Arrays([
    new Uint8Array(iv),
    tag,
    encrypted
  ])

  return ciphertext
}

export function aesDecrypt(cipherText, key) {
  cipherText = maybeHexToUint8Array(cipherText)
  key = maybeHexToUint8Array(key)

  const iv = cipherText.slice(0, 12)
  const tag = cipherText.slice(12, 12 + 16)
  const encrypted = cipherText.slice(28, cipherText.length)

  return aesAuthDecrypt(encrypted, key, iv, tag)
}


function derivePrivateKey(seed, index) {
  seed = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(seed))

  //Derive master keys
  const hash = wordArrayToUint8Array(CryptoJS.SHA512(seed))
  const masterKey = hash.subarray(0, 32)
  const masterEntropy = hash.subarray(32, 64)

  //Derive the final seed
  const indexBuf = encodeInt32(index)
  const extendedSeed = concatUint8Arrays([masterKey, indexBuf])

  const hmacWordArray = CryptoJS.HmacSHA512(CryptoJS.lib.WordArray.create(extendedSeed), CryptoJS.lib.WordArray.create(masterEntropy))

  // The first 32 bytes become the next private key
  return wordArrayToUint8Array(hmacWordArray).subarray(0, 32)
}

function deriveSecret(sharedKey) {
  sharedKey = CryptoJS.lib.WordArray.create(sharedKey)
  const pseudoRandomKey = CryptoJS.SHA256(sharedKey)

  const iv = wordArrayToUint8Array(CryptoJS.HmacSHA256("0", pseudoRandomKey)).subarray(0, 32)
  const aesKey = wordArrayToUint8Array(CryptoJS.HmacSHA256("1", CryptoJS.lib.WordArray.create(iv))).subarray(0, 32)

  return {
    iv,
    aesKey
  }
}

function aesAuthEncrypt(data, aesKey, iv) {
  // Format for SJCL
  const keyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey))
  const dataBits = sjcl.codec.hex.toBits(uint8ArrayToHex(data))
  const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv))

  const { tag, data: encrypted } = sjcl.mode.gcm.C(true, new sjcl.cipher.aes(keyBits), dataBits, [], ivBits, 128)

  return {
    encrypted: hexToUint8Array(sjcl.codec.hex.fromBits(encrypted)),
    tag: hexToUint8Array(sjcl.codec.hex.fromBits(tag))
  }
}

function aesAuthDecrypt(encrypted, aesKey, iv, tag) {
  // Format for SJCL
  const encryptedBits = sjcl.codec.hex.toBits(uint8ArrayToHex(encrypted))
  const aesKeyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey))
  const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv))
  const tagBits = sjcl.codec.hex.toBits(uint8ArrayToHex(tag))

  const { tag: actualTag, data: decrypted } = sjcl.mode.gcm.C(false, new sjcl.cipher.aes(aesKeyBits), encryptedBits, [], ivBits, 128)
  if (!sjcl.bitArray.equal(actualTag, tagBits)) {
    throw "Invalid tag"
  }
  return hexToUint8Array(sjcl.codec.hex.fromBits(decrypted))
}

