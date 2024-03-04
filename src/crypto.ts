import { Curve, HashAlgorithm, Keypair } from "./types.js";
import {
  concatUint8Arrays,
  hexToUint8Array,
  intToUint8Array,
  maybeHexToUint8Array,
  maybeStringToUint8Array,
  uint8ArrayToHex,
  wordArrayToUint8Array
} from "./utils.js";
import * as curve25519 from "curve25519-js";

// crypto
//@ts-ignore
import CryptoJS from "crypto-js";
import blake from "blakejs";
import nacl from "tweetnacl";
import pkg from "elliptic";
const { ec } = pkg;
import sha3 from "js-sha3";
// @ts-ignore
import ed2curve from "ed2curve";
// @ts-ignore
import sjcl from "sjcl";

const { sha3_512, sha3_256 } = sha3;
const EC = ec;
const ec_P256 = new EC("p256");
const ec_secp256k1 = new EC("secp256k1");
const SOFTWARE_ID = 1;

export function randomSecretKey(): Uint8Array {
  return wordArrayToUint8Array(CryptoJS.lib.WordArray.random(32));
}

/**
 * Converts a hash algorithm to an id
 * @param hashAlgo Hash algorithm
 */
export function hashAlgoToId(hashAlgo: HashAlgorithm): number {
  switch (hashAlgo) {
    case HashAlgorithm.sha256:
      return 0;
    case HashAlgorithm.sha512:
      return 1;
    case HashAlgorithm.sha3_256:
      return 2;
    case HashAlgorithm.sha3_512:
      return 3;
    case HashAlgorithm.blake2b:
      return 4;
    default:
      throw "Hash algorithm not supported";
  }
}

/**
 * Get the hash algo name from the hash algorithm ID
 * @param {number} ID Hash algorithm's ID
 */
export function IDToHashAlgo(ID: number): HashAlgorithm {
  switch (ID) {
    case 0:
      return HashAlgorithm.sha256;
    case 1:
      return HashAlgorithm.sha512;
    case 2:
      return HashAlgorithm.sha3_256;
    case 3:
      return HashAlgorithm.sha3_512;
    case 4:
      return HashAlgorithm.blake2b;
    default:
      throw "Hash algorithm not supported";
  }
}
/**
 * Get the ID of a given hash algorithm
 * @params {String} hashAlgo Hash algorithm
 */
export function hashAlgoToID(hashAlgo: HashAlgorithm): number {
  switch (hashAlgo) {
    case HashAlgorithm.sha256:
      return 0;
    case HashAlgorithm.sha512:
      return 1;
    case HashAlgorithm.sha3_256:
      return 2;
    case HashAlgorithm.sha3_512:
      return 3;
    case HashAlgorithm.blake2b:
      return 4;
    default:
      throw "Hash algorithm not supported";
  }
}

/**
 * Get the hash digest of a given content for a given hash algorithm
 * @param {string | Uint8Array} content Content to hash
 * @param {HashAlgorithm} algo Hash algorithm
 */
export function getHashDigest(content: string | Uint8Array, algo: HashAlgorithm): Uint8Array {
  switch (algo) {
    case HashAlgorithm.sha256: {
      const input = CryptoJS.lib.WordArray.create(content);
      const digest = CryptoJS.SHA256(input);
      return wordArrayToUint8Array(digest);
    }
    case HashAlgorithm.sha512: {
      const input = CryptoJS.lib.WordArray.create(content);
      const digest = CryptoJS.SHA512(input);
      return wordArrayToUint8Array(digest);
    }
    case HashAlgorithm.sha3_256: {
      const hash = sha3_256.create();
      hash.update(content);
      return new Uint8Array(hash.digest());
    }
    case HashAlgorithm.sha3_512: {
      const hash = sha3_512.create();
      hash.update(content);
      return new Uint8Array(hash.digest());
    }
    case HashAlgorithm.blake2b: {
      return blake.blake2b(content);
    }
    default:
      throw "Hash algorithm not supported";
  }
}

/**
 * Create a hash digest from the data with a hash algorithm identification prepending the digest
 * @param {string | Uint8Array} content Data to hash (string or buffer)
 * @param {HashAlgorithm} algo Hash algorithm to use
 * @returns {Uint8Array} Hash digest
 */
export function hash(content: string | Uint8Array, algo: HashAlgorithm = HashAlgorithm.sha256) {
  content = maybeStringToUint8Array(content);

  const algoID = hashAlgoToID(algo);
  const digest = getHashDigest(content, algo);

  return concatUint8Arrays(Uint8Array.from([algoID]), Uint8Array.from(digest));
}

/**
 * Get the ID of a given Elliptic curve
 * @params {String} curve Elliptic curve
 */
export function curveToID(curve: Curve): number {
  switch (curve) {
    case Curve.ed25519:
      return 0;

    case Curve.P256:
      return 1;

    case Curve.secp256k1:
      return 2;

    default:
      throw "Curve not supported";
  }
}

/**
 * Get the curve name from the curve ID
 * @param {number} ID Curve's ID
 */
export function IDToCurve(ID: number): Curve {
  switch (ID) {
    case 0:
      return Curve.ed25519;
    case 1:
      return Curve.P256;
    case 2:
      return Curve.secp256k1;
    default:
      throw "Curve ID not supported";
  }
}

export function derivePrivateKey(seed: string | Uint8Array, index: number = 0): Uint8Array {
  if(seed == undefined || seed == null) {
    throw "Seed must be defined"
  }

  if(index == undefined || index == null) {
    throw "Index must be defined"
  }

  if (index < 0) {
    throw "Index must be a positive number"
  }

  //Convert seed to Uint8Array
  seed = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(seed));

  //Derive master keys
  const hash = wordArrayToUint8Array(CryptoJS.SHA512(seed));
  const masterKey = hash.subarray(0, 32);
  const masterEntropy = hash.subarray(32, 64);

  //Derive the final seed
  const indexBuf = intToUint8Array(index);
  const extendedSeed = concatUint8Arrays(masterKey, indexBuf);

  const hmacWordArray = CryptoJS.HmacSHA512(
    CryptoJS.lib.WordArray.create(extendedSeed),
    CryptoJS.lib.WordArray.create(masterEntropy)
  );

  // The first 32 bytes become the next private key
  return wordArrayToUint8Array(hmacWordArray).subarray(0, 32);
}

/**
 * Generate a keypair using a derivation function with a seed and an index. Each keys is prepending with a curve identification.
 * @param {String} seed Keypair derivation seed
 * @param {number} index Number to identify the order of keys to generate
 * @param {String} curve Elliptic curve to use ("ed25519", "P256", "secp256k1")
 * @param {number} origin_id Origin id of the public key (0, 1, 2) = ("on chain wallet", "software", "tpm")
 */
export function deriveKeyPair(
  seed: string | Uint8Array,
  index: number = 0,
  curve = Curve.ed25519,
  origin_id: number = SOFTWARE_ID
): Keypair {
  if(seed == undefined || seed == null) {
    throw "Seed must be defined"
  }

  if(index == undefined || index == null) {
    throw "Index must be defined"
  }

  if (index < 0) {
    throw "'index' must be a positive number";
  }

  const pvBuf = derivePrivateKey(seed, index);
  return generateDeterministicKeyPair(pvBuf, curve, origin_id);
}

/**
 * Create an address from a seed, an index, an elliptic curve and an hash algorithm.
 * The address is prepended by the curve identification, the hash algorithm and the digest of the address
 *
 * @param {string | Uint8Array} seed Keypair derivation seed
 * @param {number} index Number to identify the order of keys to generate
 * @param {Curve} curve Elliptic Curve to use
 * @param {HashAlgorithm} hashAlgo Hash algorithm to use
 */
export function deriveAddress(
  seed: string | Uint8Array,
  index: number = 0,
  curve: Curve = Curve.ed25519,
  hashAlgo: HashAlgorithm = HashAlgorithm.sha256
): Uint8Array {
  seed = maybeStringToUint8Array(seed);
  const { publicKey } = deriveKeyPair(seed, index, curve);

  const curveID = curveToID(curve);
  const hashedPublicKey = hash(publicKey, hashAlgo);

  return concatUint8Arrays(Uint8Array.from([curveID]), Uint8Array.from(hashedPublicKey));
}

/**
 * Generate a new keypair deterministically with a given private key, curve and origin id
 * @params {Uint8Array} privateKey Private key
 * @params {String} curve Elliptic curve
 * @params {Integer} originID Origin identification
 */
export function generateDeterministicKeyPair(pvKey: string | Uint8Array, curve: Curve, originID: number): Keypair {
  if (typeof pvKey === "string") {
    pvKey = hexToUint8Array(pvKey);
  }
  const curveID = curveToID(curve);
  const { publicKey, privateKey } = getKeypair(pvKey, curve);

  return {
    privateKey: concatUint8Arrays(Uint8Array.from([curveID]), Uint8Array.from([originID]), privateKey),
    publicKey: concatUint8Arrays(Uint8Array.from([curveID]), Uint8Array.from([originID]), publicKey)
  };
}

/**
 * Get keypair from a private key and a specific curve
 * @param {string | Uint8Array} pvKey Private key
 * @param {Curve} curve Elliptic curve
 * @returns {Object} {publicKey: Uint8Array, privateKey: Uint8Array}
 */
function getKeypair(pvKey: string | Uint8Array, curve: Curve): { publicKey: Uint8Array; privateKey: Uint8Array } {
  if (typeof pvKey === "string") {
    pvKey = hexToUint8Array(pvKey);
  }
  // Uniform key's seed
  if (pvKey.length < 32) {
    pvKey = CryptoJS.lib.WordArray.create(pvKey);
    pvKey = wordArrayToUint8Array(CryptoJS.SHA256(pvKey));
  }

  if (pvKey.length > 32) {
    pvKey = pvKey.subarray(0, 32);
  }

  switch (curve) {
    case Curve.ed25519: {
      const { publicKey } = nacl.sign.keyPair.fromSeed(pvKey);

      return {
        privateKey: pvKey,
        publicKey: publicKey
      };
    }
    case Curve.P256: {
      const key = ec_P256.keyFromPrivate(pvKey);
      const pubBuf = hexToUint8Array(key.getPublic().encode("hex", false));

      return {
        privateKey: pvKey,
        publicKey: pubBuf
      };
    }
    case Curve.secp256k1: {
      const key = ec_secp256k1.keyFromPrivate(pvKey);
      const pubBuf = hexToUint8Array(key.getPublic().encode("hex", false));
      return {
        privateKey: pvKey,
        publicKey: pubBuf
      };
    }
    default:
      throw "Curve not supported";
  }
}

/**
 * Sign data with a private key
 * @param { string | Uint8Array } data Data to sign
 * @param { string | Uint8Array } privateKey Private key used to sign the data
 */
export function sign(data: string | Uint8Array, privateKey: string | Uint8Array): Uint8Array {
  privateKey = maybeStringToUint8Array(privateKey);
  data = maybeStringToUint8Array(data);

  const curveBuf = privateKey.slice(0, 1);
  const pvBuf = privateKey.slice(2, privateKey.length);

  const curve = curveBuf[0];

  switch (curve) {
    case 0: {
      const { secretKey: secretKey } = nacl.sign.keyPair.fromSeed(pvBuf);
      return nacl.sign.detached(data, secretKey);
    }
    case 1: {
      data = CryptoJS.lib.WordArray.create(data);
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data));
      const key = ec_P256.keyFromPrivate(pvBuf);
      return Uint8Array.from(key.sign(msgHash).toDER());
    }
    case 2: {
      data = CryptoJS.lib.WordArray.create(data);
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data));
      const key = ec_secp256k1.keyFromPrivate(pvBuf);
      return Uint8Array.from(key.sign(msgHash).toDER());
    }
    default:
      throw "Curve not supported";
  }
}

/**
 * Verify a signature
 * @param {string | Uint8Array} sig Signature to verify
 * @param {string | Uint8Array} data Data to verify
 * @param {string | Uint8Array} publicKey Public key used to verify the signature
 */
export function verify(sig: string | Uint8Array, data: string | Uint8Array, publicKey: string | Uint8Array): boolean {
  sig = maybeStringToUint8Array(sig);
  data = maybeStringToUint8Array(data);
  publicKey = maybeStringToUint8Array(publicKey);

  const curveBuf = publicKey.slice(0, 1);
  const pubBuf = publicKey.slice(2, publicKey.length);

  const curve = curveBuf[0];
  switch (curve) {
    case 0: {
      return nacl.sign.detached.verify(data, sig, pubBuf);
    }
    case 1: {
      data = CryptoJS.lib.WordArray.create(data);
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data));
      const key = ec_P256.keyFromPublic(pubBuf);
      return key.verify(msgHash, sig);
    }
    case 2: {
      data = CryptoJS.lib.WordArray.create(data);
      const msgHash = wordArrayToUint8Array(CryptoJS.SHA256(data));
      const key = ec_secp256k1.keyFromPublic(pubBuf);
      return key.verify(msgHash, sig);
    }
    default:
      throw "Curve not supported";
  }
}

/**
 * Encrypt a data for a given public key using ECIES algorithm
 * @param {string | Uint8Array} data Data to encrypt
 * @param {string | Uint8Array} publicKey Public key for the shared secret encryption
 */
export function ecEncrypt(data: string | Uint8Array, publicKey: string | Uint8Array): Uint8Array {
  publicKey = maybeStringToUint8Array(publicKey);
  data = maybeStringToUint8Array(data);

  const curveBuf = publicKey.slice(0, 1);
  const pubBuf = publicKey.slice(2, publicKey.length);

  const curve = curveBuf[0];
  switch (curve) {
    case 0: {
      const { public: ephemeralPublicKey, private: ephemeralPrivateKey } =
        curve25519.generateKeyPair(randomSecretKey());
      const curve25519pub = ed2curve.convertPublicKey(pubBuf);

      if (!curve25519pub) {
        throw "public key in not a valid Ed25519 public key";
      }
      const sharedKey = curve25519.sharedKey(ephemeralPrivateKey, curve25519pub);
      const { aesKey, iv } = deriveSecret(sharedKey);

      const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv);

      return concatUint8Arrays(ephemeralPublicKey, tag, encrypted);
    }
    case 1: {
      const ecdh = ec_P256.genKeyPair();
      const pubKey = ec_P256.keyFromPublic(pubBuf).getPublic();
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray());

      const { aesKey, iv } = deriveSecret(sharedKey);
      const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv);

      return concatUint8Arrays(hexToUint8Array(ecdh.getPublic().encode("hex", false)), tag, encrypted);
    }
    case 2: {
      const ecdh = ec_secp256k1.genKeyPair();
      const pubKey = ec_secp256k1.keyFromPublic(pubBuf).getPublic();
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray());

      const { aesKey, iv } = deriveSecret(sharedKey);
      const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv);

      return concatUint8Arrays(hexToUint8Array(ecdh.getPublic().encode("hex", false)), tag, encrypted);
    }
    default:
      throw "Curve not supported";
  }
}

export function ecDecrypt(ciphertext: string | Uint8Array, privateKey: string | Uint8Array): Uint8Array {
  ciphertext = maybeStringToUint8Array(ciphertext);
  privateKey = maybeStringToUint8Array(privateKey);

  const curveBuf = privateKey.slice(0, 1);
  const pvBuf = privateKey.slice(2, privateKey.length);

  const curve = curveBuf[0];
  switch (curve) {
    case 0: {
      const ephemeralPublicKey = ciphertext.slice(0, 32);
      const tag = ciphertext.slice(32, 32 + 16);
      const encrypted = ciphertext.slice(32 + 16, ciphertext.length);

      const curve25519pv = ed2curve.convertSecretKey(pvBuf);

      const sharedKey = curve25519.sharedKey(curve25519pv, ephemeralPublicKey);
      const { aesKey, iv } = deriveSecret(sharedKey);

      return aesAuthDecrypt(encrypted, aesKey, iv, tag);
    }
    case 1: {
      const ephemeralPublicKey = ciphertext.slice(0, 65);
      const tag = ciphertext.slice(65, 65 + 16);
      const encrypted = ciphertext.slice(65 + 16, ciphertext.length);

      const ecdh = ec_P256.keyFromPrivate(pvBuf);
      const pubKey = ec_P256.keyFromPublic(ephemeralPublicKey).getPublic();
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray());

      const { aesKey, iv } = deriveSecret(sharedKey);

      return aesAuthDecrypt(encrypted, aesKey, iv, tag);
    }
    case 2: {
      const ephemeralPubKey = ciphertext.slice(0, 65);
      const tag = ciphertext.slice(65, 65 + 16);
      const encrypted = ciphertext.slice(65 + 16, ciphertext.length);

      const ecdh = ec_secp256k1.keyFromPrivate(pvBuf);
      const pubKey = ec_secp256k1.keyFromPublic(ephemeralPubKey).getPublic();
      const sharedKey = Uint8Array.from(ecdh.derive(pubKey).toArray());

      const { aesKey, iv } = deriveSecret(sharedKey);

      return aesAuthDecrypt(encrypted, aesKey, iv, tag);
    }
    default:
      throw "Curve not supported";
  }
}

/**
 * Encrypt a data for a given public key using AES algorithm
 * @param {string | Uint8Array} data Data to encrypt
 * @param {string | Uint8Array} key Symmetric key
 */
export function aesEncrypt(data: string | Uint8Array, key: string | Uint8Array): Uint8Array {
  key = maybeHexToUint8Array(key);
  data = maybeStringToUint8Array(data);

  const iv = wordArrayToUint8Array(CryptoJS.lib.WordArray.random(12));

  const { tag: tag, encrypted: encrypted } = aesAuthEncrypt(data, key, iv);

  return concatUint8Arrays(new Uint8Array(iv), tag, encrypted);
}

/**
 * Decrypt cipherText for a given key using AES algorithm
 * @param cipherText Ciphertext to decrypt
 * @param key Symmetric key
 */
export function aesDecrypt(cipherText: string | Uint8Array, key: string | Uint8Array): Uint8Array {
  cipherText = maybeHexToUint8Array(cipherText);
  key = maybeHexToUint8Array(key);

  const iv = cipherText.slice(0, 12);
  const tag = cipherText.slice(12, 12 + 16);
  const encrypted = cipherText.slice(28, cipherText.length);

  return aesAuthDecrypt(encrypted, key, iv, tag);
}

/**
 * Derive a secret from a shared key
 * @param sharedKey
 */
function deriveSecret(sharedKey: Uint8Array): { aesKey: Uint8Array; iv: Uint8Array } {
  sharedKey = CryptoJS.lib.WordArray.create(sharedKey);
  const pseudoRandomKey = CryptoJS.SHA256(sharedKey);

  const iv = wordArrayToUint8Array(CryptoJS.HmacSHA256("0", pseudoRandomKey)).subarray(0, 32);
  const aesKey = wordArrayToUint8Array(CryptoJS.HmacSHA256("1", CryptoJS.lib.WordArray.create(iv))).subarray(0, 32);

  return { aesKey, iv };
}

/**
 * Encrypt data with AES
 * @param data Data to encrypt
 * @param aesKey AES key
 * @param iv Initialization vector
 */
function aesAuthEncrypt(
  data: Uint8Array,
  aesKey: Uint8Array,
  iv: Uint8Array
): { tag: Uint8Array; encrypted: Uint8Array } {
  // Format for SJCL
  const keyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey));
  const dataBits = sjcl.codec.hex.toBits(uint8ArrayToHex(data));
  const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv));

  const { tag, data: encrypted } = sjcl.mode.gcm.C(true, new sjcl.cipher.aes(keyBits), dataBits, [], ivBits, 128);

  return {
    encrypted: hexToUint8Array(sjcl.codec.hex.fromBits(encrypted)),
    tag: hexToUint8Array(sjcl.codec.hex.fromBits(tag))
  };
}

/**
 * Decrypt data with AES
 * @param encrypted Encrypted data
 * @param aesKey AES key
 * @param iv Initialization vector
 * @param tag Tag
 */
function aesAuthDecrypt(encrypted: Uint8Array, aesKey: Uint8Array, iv: Uint8Array, tag: Uint8Array) {
  // Format for SJCL
  const encryptedBits = sjcl.codec.hex.toBits(uint8ArrayToHex(encrypted));
  const aesKeyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey));
  const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv));
  const tagBits = sjcl.codec.hex.toBits(uint8ArrayToHex(tag));

  const { tag: actualTag, data: decrypted } = sjcl.mode.gcm.C(
    false,
    new sjcl.cipher.aes(aesKeyBits),
    encryptedBits,
    [],
    ivBits,
    128
  );
  if (!sjcl.bitArray.equal(actualTag, tagBits)) {
    throw "Invalid tag";
  }
  return hexToUint8Array(sjcl.codec.hex.fromBits(decrypted));
}
