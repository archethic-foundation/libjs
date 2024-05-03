import { AuthorizedKeyUserInput, Curve, HashAlgorithm, Keypair } from "./types.js";
import {
  concatUint8Arrays,
  hexToUint8Array,
  intToUint8Array,
  maybeHexToUint8Array,
  maybeStringToUint8Array,
  maybeUint8ArrayToHex,
  uint8ArrayToHex,
  wordArrayToUint8Array
} from "./utils.js";
import * as curve25519 from "curve25519-js";

// crypto
//@ts-ignore
import CryptoJS from "crypto-js";
import blake from "blakejs";
import nacl from "tweetnacl";
import { ec } from "elliptic";
import sha3 from "js-sha3";
import ed2curve from "ed2curve";
import sjcl from "sjcl";
import Keychain from "./keychain.js";

const { sha3_512, sha3_256 } = sha3;
const ec_P256 = new ec("p256");
const ec_secp256k1 = new ec("secp256k1");
const SOFTWARE_ID = 1;

/**
 * Generate a random secret key of 32 bytes
 * @returns {Uint8Array} Random secret key
 */
export function randomSecretKey(): Uint8Array {
  return wordArrayToUint8Array(CryptoJS.lib.WordArray.random(32));
}

const hashAlgoMap = {
  [HashAlgorithm.sha256]: 0,
  [HashAlgorithm.sha512]: 1,
  [HashAlgorithm.sha3_256]: 2,
  [HashAlgorithm.sha3_512]: 3,
  [HashAlgorithm.blake2b]: 4
};

/**
 * Get the hash algo name from the hash algorithm ID
 * @param {number} ID Hash algorithm's ID
 * @returns {HashAlgorithm} Hash algorithm's name
 */
export function IDToHashAlgo(ID: number): HashAlgorithm {
  const hashAlgo = findHashAlgoById(ID);
  if (hashAlgo === undefined) {
    throw new Error("Hash algorithm not supported");
  }
  return hashAlgo as HashAlgorithm;
}

function findHashAlgoById(ID: number) {
  return Object.keys(hashAlgoMap).find((key) => hashAlgoMap[key as HashAlgorithm] === ID);
}

/**
 * Get the ID of a given hash algorithm
 * @param {String} hashAlgo Hash algorithm
 * @returns {number} Hash algorithm's ID
 */
export function hashAlgoToID(hashAlgo: HashAlgorithm): number {
  const ID = hashAlgoMap[hashAlgo];
  if (ID === undefined) {
    throw new Error("Hash algorithm not supported");
  }
  return ID;
}

/**
 * Get the hash digest of a given content for a given hash algorithm
 * @param {string | Uint8Array} content Content to hash
 * @param {HashAlgorithm} algo Hash algorithm
 * @returns {Uint8Array} Hash digest
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
      throw new Error("Hash algorithm not supported");
  }
}

/**
 * Create a hash digest from the data with a hash algorithm identification prepending the digest
 * @param {string | Uint8Array} content Data to hash (string or buffer)
 * @param {HashAlgorithm} algo Hash algorithm to use
 * @returns {Uint8Array} Hash digest
 */
export function hash(content: string | Uint8Array, algo: HashAlgorithm = HashAlgorithm.sha256): Uint8Array {
  content = maybeStringToUint8Array(content);

  const algoID = hashAlgoToID(algo);
  const digest = getHashDigest(content, algo);

  return concatUint8Arrays(Uint8Array.from([algoID]), Uint8Array.from(digest));
}

/**
 * Get the ID of a given Elliptic curve
 * @param {String} curve Elliptic curve
 * @returns {number} Curve's ID
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
      throw new Error("Curve not supported");
  }
}

/**
 * Get the curve name from the curve ID
 * @param {number} ID Curve's ID
 * @returns {Curve} Curve's name
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
      throw new Error("Curve ID not supported");
  }
}

/**
 * Derive a private key from a seed and an index
 * @param {string | Uint8Array} seed Seed to derive the private key
 * @param {number} index Index to derive the private key
 * @returns {Uint8Array} Derived private key
 */
export function derivePrivateKey(seed: string | Uint8Array, index: number = 0): Uint8Array {
  if (seed === undefined || seed === null) {
    throw new Error("Seed must be defined");
  }

  if (index === undefined || index === null) {
    throw new Error("Index must be defined");
  }

  if (index < 0) {
    throw new Error("Index must be a positive number");
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
 * Generate a keypair using a derivation function with a seed and an index. Each keys is prepending with a curve identification
 * @param {String} seed Keypair derivation seed
 * @param {number} index Number to identify the order of keys to generate
 * @param {Curve} curve Elliptic curve to use ("ed25519", "P256", "secp256k1")
 * @param {number} origin_id Origin id of the public key (0, 1, 2) = ("on chain wallet", "software", "tpm")
 * @returns {Object} {publicKey: Uint8Array, privateKey: Uint8Array}
 */
export function deriveKeyPair(
  seed: string | Uint8Array,
  index: number = 0,
  curve: Curve = Curve.ed25519,
  origin_id: number = SOFTWARE_ID
): Keypair {
  if (seed === undefined || seed === null) {
    throw new Error("Seed must be defined");
  }

  if (index === undefined || index === null) {
    throw new Error("Index must be defined");
  }

  if (index < 0) {
    throw new Error("'index' must be a positive number");
  }

  const pvBuf = derivePrivateKey(seed, index);
  return generateDeterministicKeyPair(pvBuf, curve, origin_id);
}

/**
 * Create an address from a seed, an index, an elliptic curve and an hash algorithm
 *
 * The address is prepended by the curve identification, the hash algorithm and the digest of the address
 * @param {string | Uint8Array} seed Keypair derivation seed
 * @param {number} index Number to identify the order of keys to generate
 * @param {Curve} curve Elliptic Curve to use
 * @param {HashAlgorithm} hashAlgo Hash algorithm to use
 * @returns {Uint8Array} Address
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
 * @param {Uint8Array} pvKey Private key
 * @param {String} curve Elliptic curve
 * @param {Integer} originID Origin identification
 * @returns {Object} {publicKey: Uint8Array, privateKey: Uint8Array}
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
      throw new Error("Curve not supported");
  }
}

/**
 * Sign data with a private key
 * @param { string | Uint8Array } data Data to sign
 * @param { string | Uint8Array } privateKey Private key used to sign the data
 * @returns { Uint8Array } Signature
 */
export function sign(data: string | Uint8Array, privateKey: string | Uint8Array): Uint8Array {
  privateKey = maybeStringToUint8Array(privateKey);
  data = maybeStringToUint8Array(data);

  const curveBuf = privateKey.slice(0, 1);
  const pvBuf = privateKey.slice(2, privateKey.length);

  const curve = curveBuf[0];

  switch (curve) {
    case 0: {
      const { secretKey } = nacl.sign.keyPair.fromSeed(pvBuf);
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
      throw new Error("Curve not supported");
  }
}

/**
 * Verify a signature
 * @param {string | Uint8Array} sig Signature to verify
 * @param {string | Uint8Array} data Data to verify
 * @param {string | Uint8Array} publicKey Public key used to verify the signature
 * @returns {boolean} True if the signature is valid, false otherwise
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
      throw new Error("Curve not supported");
  }
}

/**
 * Encrypt a data for a given public key using ECIES algorithm
 * @param {string | Uint8Array} data Data to encrypt
 * @param {string | Uint8Array} publicKey Public key for the shared secret encryption
 * @returns {Uint8Array} Encrypted data
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
        throw new Error("public key in not a valid Ed25519 public key");
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
      throw new Error("Curve not supported");
  }
}

/**
 * Decrypt a data for a given private key using ECIES algorithm
 * @param {string | Uint8Array} ciphertext Data to decrypt
 * @param {string | Uint8Array} privateKey Private key for the shared secret decryption
 * @returns {Uint8Array} Decrypted data
 */
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
      throw new Error("Curve not supported");
  }
}

/**
 * Encrypt a data for a given AES key using AES algorithm
 * @param {string | Uint8Array} data Data to encrypt
 * @param {string | Uint8Array} aesKey AES key (Symmetric key)
 * @returns {Uint8Array} Encrypted data
 */
export function aesEncrypt(data: string | Uint8Array, aesKey: string | Uint8Array): Uint8Array {
  aesKey = maybeHexToUint8Array(aesKey);
  data = maybeStringToUint8Array(data);

  const iv = wordArrayToUint8Array(CryptoJS.lib.WordArray.random(12));
  const { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv);

  return concatUint8Arrays(new Uint8Array(iv), tag, encrypted);
}

/**
 * Decrypt a data for a given AES key using AES algorithm
 * @param {string | Uint8Array} cipherText Data to decrypt
 * @param {string | Uint8Array} aesKey AES key (Symmetric key)
 * @returns {Uint8Array} Decrypted data
 */
export function aesDecrypt(cipherText: string | Uint8Array, aesKey: string | Uint8Array): Uint8Array {
  cipherText = maybeHexToUint8Array(cipherText);
  aesKey = maybeHexToUint8Array(aesKey);

  const iv = cipherText.slice(0, 12);
  const tag = cipherText.slice(12, 12 + 16);
  const encrypted = cipherText.slice(28, cipherText.length);

  return aesAuthDecrypt(encrypted, aesKey, iv, tag);
}

/**
 * Derive a secret from a shared key
 * @param {Uint8Array} sharedKey
 * @returns {Object} {aesKey: Uint8Array, iv: Uint8Array}
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
 * @param {Uint8Array} data Data to encrypt
 * @param {Uint8Array} aesKey AES key
 * @param {Uint8Array} iv Initialization vector
 * @returns {Object} {tag: Uint8Array, encrypted: Uint8Array}
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

  // @ts-expect-error sjcl.mode.gcm.C is not in types
  const { tag, data: encrypted } = sjcl.mode.gcm.C(true, new sjcl.cipher.aes(keyBits), dataBits, [], ivBits, 128);

  return {
    encrypted: hexToUint8Array(sjcl.codec.hex.fromBits(encrypted)),
    tag: hexToUint8Array(sjcl.codec.hex.fromBits(tag))
  };
}

/**
 * Decrypt data with AES
 * @param {Uint8Array} encrypted Encrypted data
 * @param {Uint8Array} aesKey AES key
 * @param {Uint8Array} iv Initialization vector
 * @param {Uint8Array} tag Tag
 * @returns {Uint8Array} Decrypted data
 */
function aesAuthDecrypt(encrypted: Uint8Array, aesKey: Uint8Array, iv: Uint8Array, tag: Uint8Array): Uint8Array {
  // Format for SJCL
  const encryptedBits = sjcl.codec.hex.toBits(uint8ArrayToHex(encrypted));
  const aesKeyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey));
  const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv));
  const tagBits = sjcl.codec.hex.toBits(uint8ArrayToHex(tag));

  // @ts-expect-error sjcl.mode.gcm.C is not in types
  const { tag: actualTag, data: decrypted } = sjcl.mode.gcm.C(
    false,
    new sjcl.cipher.aes(aesKeyBits),
    encryptedBits,
    [],
    ivBits,
    128
  );
  if (!sjcl.bitArray.equal(actualTag, tagBits)) {
    throw new Error("Invalid tag");
  }
  return hexToUint8Array(sjcl.codec.hex.fromBits(decrypted));
}

/**
 * Determines if an address is valid
 * @param { string | UIntArray } address Address to verify
 */
export function isValidAddress(address: string | Uint8Array): boolean {
  try {
    const addressBinary = maybeHexToUint8Array(address);
    const curveId = addressBinary[0];
    if (!validCurveId(curveId)) {
      return false;
    }

    const hashAlgoId = addressBinary[1];
    if (!validHashAlgoId(hashAlgoId)) {
      return false;
    }

    const digest = addressBinary.slice(2, addressBinary.length);
    return validHash(findHashAlgoById(hashAlgoId) as HashAlgorithm, digest);
  } catch (e) {
    return false;
  }
}

function validCurveId(id: number): boolean {
  try {
    IDToCurve(id);
    return true;
  } catch (e) {
    return false;
  }
}

function validHashAlgoId(id: number): boolean {
  try {
    IDToHashAlgo(id);
    return true;
  } catch (e) {
    return false;
  }
}

function validHash(hashAlgo: HashAlgorithm, digest: Uint8Array) {
  switch (hashAlgo) {
    case HashAlgorithm.sha256:
      return digest.length == 32;
    case HashAlgorithm.sha512:
      return digest.length == 64;
    case HashAlgorithm.sha3_256:
      return digest.length == 32;
    case HashAlgorithm.sha3_512:
      return digest.length == 64;
    case HashAlgorithm.blake2b:
      return digest.length == 64;
  }
}

/**
 * Generates the genesis address (the first address) from a given seed
 * @param {string | Uint8Array} seed The seed used to generate the address
 * @returns {string} The genesis address in hexadecimal format
 */
export function getGenesisAddress(seed: string | Uint8Array): string {
  return uint8ArrayToHex(deriveAddress(seed, 0));
}

/**
 * Derives the genesis address for a given service from a keychain
 * @param {Keychain} keychain The keychain used to derive the address
 * @param {string} service The service for which to derive the address
 * @param {string} [suffix=""] An optional suffix to append to the service before deriving the address
 * @returns {string} The genesis address for the service in hexadecimal format
 */
export function getServiceGenesisAddress(keychain: Keychain, service: string, suffix: string = ""): string {
  return uint8ArrayToHex(keychain.deriveAddress(service, 0, suffix));
}

/**
 * Encrypts a secret using a given public key
 * @param {string | Uint8Array} secret The secret to encrypt
 * @param {string | Uint8Array} publicKey The public key to use for encryption
 * @returns {Object} {encryptedSecret: Uint8Array, authorizedKeys: AuthorizedKeyUserInput[]}
 * @example
 * const storageNoncePublicKey = await archethic.network.getStorageNoncePublicKey();
 * const { encryptedSecret, authorizedKeys } = encryptSecret(Crypto.randomSecretKey(), storageNoncePublicKey);
 * const code = "" // The contract code
 * const tx = await archethic.transaction
 *  .new()
 *  .setType("contract")
 *  .setCode(code)
 *  .addOwnership(encryptedSecret, authorizedKeys)
 *  .build(seed, 0)
 *  .originSign(originPrivateKey)
 *  .send();
 */
export function encryptSecret(
  secret: string | Uint8Array,
  publicKey: string | Uint8Array
): { encryptedSecret: Uint8Array; authorizedKeys: AuthorizedKeyUserInput[] } {
  const aesKey = randomSecretKey();
  const encryptedSecret = aesEncrypt(secret, aesKey);
  const encryptedAesKey = uint8ArrayToHex(ecEncrypt(aesKey, publicKey));
  const authorizedKeys: AuthorizedKeyUserInput[] = [
    { encryptedSecretKey: encryptedAesKey, publicKey: maybeUint8ArrayToHex(publicKey) }
  ];
  return { encryptedSecret, authorizedKeys };
}
