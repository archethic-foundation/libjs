import {
  base64url,
  concatUint8Arrays,
  intToUint8Array,
  maybeHexToUint8Array,
  uint8ArrayToHex,
  uint8ArrayToInt,
  wordArrayToUint8Array
} from "./utils.js";
import {
  Curve,
  DIDDocument,
  DIDVerificationMethod,
  HashAlgorithm,
  Keypair,
  Services,
  ecEncryptServiceSeed
} from "./types.js";
import TransactionBuilder from "./transaction_builder.js";
import {
  curveToID,
  deriveAddress,
  deriveKeyPair,
  generateDeterministicKeyPair,
  hash,
  hashAlgoToID,
  randomSecretKey,
  ecEncrypt,
  aesEncrypt,
  sign,
  IDToCurve,
  IDToHashAlgo
} from "./crypto.js";
// @ts-ignore
import CryptoJS from "crypto-js";

const KEYCHAIN_ORIGIN_ID = 0;

export default class Keychain {
  seed: Uint8Array;
  version: number;
  services: Services;
  authorizedPublicKeys: Uint8Array[];

  /**
   * Create a new keychain
   * @param {String | Uint8Array} seed Seed of the keychain
   * @param {number} version Version of the keychain
   * @example
   * ```ts
   * import { Keychain } from "@archethicjs/sdk";
   *
   * const keychain = new Keychain("myseed");
   * ```
   */
  constructor(seed: string | Uint8Array, version: number = 1) {
    if (typeof seed === "string") {
      this.seed = new TextEncoder().encode(seed);
    } else {
      this.seed = seed;
    }

    this.version = version;
    this.services = {};
    this.authorizedPublicKeys = [];
  }

  /**
   * Add a service into the keychain
   * @param {String} name Name of the service to add
   * @param {String} derivationPath Crypto derivation path
   * @param {Curve} curve Elliptic curve to use
   * @param {HashAlgorithm} hashAlgo Hash algo
   * @returns {Keychain} The keychain instance
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const accessKeychainSeed = "myseed";
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * keychain.addService("nft1", "m/650'/1/0")
   * ```
   */
  addService(
    name: string,
    derivationPath: string,
    curve: Curve = Curve.ed25519,
    hashAlgo: HashAlgorithm = HashAlgorithm.sha256
  ): this {
    this.services[name] = {
      derivationPath: derivationPath,
      curve: curve,
      hashAlgo: hashAlgo
    };
    return this;
  }

  /**
   * Remove a service from the keychain
   * @param {String} name Name of the service to add
   * @returns {Keychain} The keychain instance
   * @example
   * ```ts
   * import Archethic, { Crypto } from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const accessSeed = "myseed";
   * const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * keychain.removeService("uco");
   * ```
   */
  removeService(name: string): this {
    delete this.services[name];
    return this;
  }

  /**
   * Add a public key to the authorized public keys list
   * @param {String | Uint8Array} key Public key to add
   * @returns {Keychain} The keychain instance
   * @example
   * ```ts
   * import Archethic, { Crypto } from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const accessSeed = "myseed";
   * const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * keychain.addAuthorizedPublicKey(publicKey);
   * ```
   */
  addAuthorizedPublicKey(key: string | Uint8Array): this {
    key = maybeHexToUint8Array(key);

    // prevent duplicate
    this.removeAuthorizedPublicKey(key);

    this.authorizedPublicKeys.push(key);
    return this;
  }

  /**
   * Remove a public key from the authorized public keys list
   * @param {String | Uint8Array} key Public key to remove
   * @returns {Keychain} The keychain instance
   * @example
   * ```ts
   * import Archethic, { Crypto } from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const accessSeed = "myseed";
   * const { publicKey } = Crypto.deriveKeyPair(accessSeed, 0);
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * keychain.removeAuthorizedPublicKey(publicKey);
   * ```
   */
  removeAuthorizedPublicKey(key: string | Uint8Array): this {
    this.authorizedPublicKeys = this.authorizedPublicKeys.filter((k) => {
      // javascript can't compare objects so we compare strings
      return uint8ArrayToHex(k) !== uint8ArrayToHex(maybeHexToUint8Array(key));
    });
    return this;
  }

  /**
   * Generate address, previousPublicKey, previousSignature of the transaction and serialize it
   * @param tx The transaction to build is an instance of TransactionBuilder
   * @param service The service name to use for getting the derivation path, the curve and the hash algo
   * @param index The number of transactions in the chain, to generate the actual and the next public key (see the cryptography section)
   * @param suffix Additional information to add to a service derivation path (default to empty)
   * @returns {TransactionBuilder} The transaction with the address, previousPublicKey and previousSignature set
   * @throws {Error} If the service doesn't exist in the keychain
   * @throws {Error} If the index is not a positive number
   * @throws {Error} If the suffix is not a string
   * @example
   * Notice that the function also sign the TransactionBuilder given in param, so getting the return is not mandatory
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   *
   * const index = archethic.transaction.getTransactionIndex(keychain.deriveAddress("uco", 0));
   * const signedTx = keychain.buildTransaction(tx, "uco", index);
   * ```
   */
  buildTransaction(tx: TransactionBuilder, service: string, index: number, suffix: string = ""): TransactionBuilder {
    if (!this.services[service]) {
      throw new Error("Service doesn't exist in the keychain");
    }

    if (typeof index !== "number" || index < 0) {
      throw Error("'index' must be a positive number");
    }

    if (typeof suffix !== "string") {
      throw Error("'suffix must be a string");
    }

    const keypair: Keypair = this.deriveKeypair(service, index, suffix);
    const address: Uint8Array = this.deriveAddress(service, index + 1, suffix);

    tx.setAddress(address);

    const payloadForPreviousSignature = tx.previousSignaturePayload();
    const previousSignature = sign(payloadForPreviousSignature, keypair.privateKey);

    tx.setPreviousSignatureAndPreviousPublicKey(previousSignature, keypair.publicKey);

    return tx;
  }
  /**
   * Encode the keychain
   * @returns {Uint8Array} The keychain encoded in binary
   * @internal
   */
  encode(): Uint8Array {
    const servicesBuffer = [];
    for (const service of Object.keys(this.services)) {
      const { derivationPath, curve, hashAlgo } = this.services[service];
      servicesBuffer.push(
        concatUint8Arrays(
          Uint8Array.from([service.length]),
          new TextEncoder().encode(service),
          Uint8Array.from([derivationPath.length]),
          new TextEncoder().encode(derivationPath),
          Uint8Array.from([curveToID(curve)]),
          Uint8Array.from([hashAlgoToID(hashAlgo)])
        )
      );
    }

    return concatUint8Arrays(
      intToUint8Array(this.version),
      Uint8Array.from([this.seed.length]),
      this.seed,
      Uint8Array.from([Object.keys(this.services).length]),
      concatUint8Arrays(...servicesBuffer)
    );
  }

  /**
   * Decode a keychain from a binary
   * @param binary {Uint8Array}
   * @returns {Keychain} The keychain decoded from the binary
   * @internal
   */
  static decode(binary: Uint8Array): Keychain {
    const { bytes: version, pos: versionPos } = readBytes(binary, 0, 4);
    const { byte: seedSize, pos: seedSizePos } = readByte(binary, versionPos, 1);
    const { bytes: seed, pos: seedPos } = readBytes(binary, seedSizePos, seedSize);
    let { byte: nbServices, pos: nbServicesPos } = readByte(binary, seedPos, 1);

    const keychain = new Keychain(seed, uint8ArrayToInt(version));

    for (let i = 0; i < nbServices; i++) {
      const { byte: serviceNameLength, pos: serviceNameLengthPos } = readByte(binary, nbServicesPos, 1);
      const { bytes: serviceName, pos: serviceNamePos } = readBytes(binary, serviceNameLengthPos, serviceNameLength);
      const { byte: derivationPathLength, pos: derivationPathLengthPos } = readByte(binary, serviceNamePos, 1);
      const { bytes: derivationPath, pos: derivationPathPos } = readBytes(
        binary,
        derivationPathLengthPos,
        derivationPathLength
      );
      const { byte: curveID, pos: curveIDPos } = readByte(binary, derivationPathPos, 1);
      const { byte: hashAlgoID, pos: hashAlgoIDPos } = readByte(binary, curveIDPos, 1);

      const serviceNameString = new TextDecoder().decode(serviceName);
      const derivationPathString = new TextDecoder().decode(derivationPath);

      keychain.addService(serviceNameString, derivationPathString, IDToCurve(curveID), IDToHashAlgo(hashAlgoID));
      nbServicesPos = hashAlgoIDPos;
    }
    return keychain;
  }

  /**
   * Derive a keypair for the given service at the index given
   * @param service Service name to identify the derivation path to use.
   * @param index Chain index to derive (default to 0).
   * @param pathSuffix Additional information to add to a service derivation path (default to empty).
   * @returns {Keypair} The keypair derived from the keychain seed, the service derivation path, the index and the path suffix.
   * @throws {Error} If the service doesn't exist in the keychain.
   * @throws {Error} If the index is not a positive number.
   * @throws {Error} If the pathSuffix is not a string.
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * const { publicKey } = keychain.deriveKeypair("uco", 0);
   * ```
   */
  deriveKeypair(service: string, index: number = 0, pathSuffix: string = ""): Keypair {
    if (!this.services[service]) {
      throw Error("Service doesn't exist in the keychain");
    }

    if (index < 0) {
      throw Error("'index' must be a positive number");
    }

    const { derivationPath, curve } = this.services[service];
    return deriveArchethicKeypair(this.seed, derivationPath, index, curve, pathSuffix);
  }

  /**
   * Derive an address for the given service at the index given
   * @param service Service name to identify the derivation path to use.
   * @param index Chain index to derive (default to 0).
   * @param pathSuffix Additional information to add to a service derivation path (default to empty).
   * @returns {Uint8Array} The address derived from the keychain seed, the service derivation path, the index and the path suffix.
   * @throws {Error} If the service doesn't exist in the keychain.
   * @throws {Error} If the index is not a positive number.
   * @throws {Error} If the pathSuffix is not a string.
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * const genesisUCOAddress = keychain.deriveAddress("uco", 0);
   * ```
   */
  deriveAddress(service: string, index: number = 0, pathSuffix: string = ""): Uint8Array {
    if (!this.services[service]) {
      throw Error("Service doesn't exist in the keychain");
    }

    if (index < 0) {
      throw Error("'index' must be a positive number");
    }

    const { derivationPath, curve, hashAlgo } = this.services[service];
    const { publicKey } = deriveArchethicKeypair(this.seed, derivationPath, index, curve, pathSuffix);
    const curveID = curveToID(curve);

    const hashedPublicKey = hash(publicKey, hashAlgo);

    return concatUint8Arrays(Uint8Array.from([curveID]), Uint8Array.from(hashedPublicKey));
  }

  /**
   * Return a Decentralized Identity document from the keychain. (This is used in the transaction's content of the keychain tx)
   * @returns {Object} The Decentralized Identity document
   * @example
   * ```ts
   * import Archethic from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("https://testnet.archethic.net");
   * await archethic.connect();
   *
   * const keychain = await archethic.account.getKeychain(accessKeychainSeed);
   * const did  = keychain.toDID()
   * console.log(did)
   * {
   *   "@context": [
   *      "https://www.w3.org/ns/did/v1"
   *   ],
   *   "id": "did:archethic:keychain_address",
   *   "authentification": servicesMaterials, //list of public keys of the services
   *   "verificationMethod": servicesMaterials //list of public keys of the services
   * }
   * ```
   */
  toDID(): DIDDocument {
    const address = deriveAddress(this.seed, 0);
    const address_hex = uint8ArrayToHex(address);

    const verificationMethods: DIDVerificationMethod[] = [];
    const authentications = [];

    for (const service of Object.keys(this.services)) {
      const { derivationPath, curve } = this.services[service];

      const purpose = derivationPath
        .split("/")
        .map((v) => v.replace("'", ""))
        .at(1);

      //Only support of archethic derivation scheme for now
      if (purpose === "650") {
        const { publicKey } = deriveArchethicKeypair(this.seed, derivationPath, 0, curve);

        verificationMethods.push({
          id: `did:archethic:${address_hex}#${service}`,
          type: "JsonWebKey2020",
          publicKeyJwk: keyToJWK(publicKey, service),
          controller: `did:archethic:${address_hex}`
        });

        authentications.push(`did:archethic:${address_hex}#${service}`);
      } else {
        throw Error(`Purpose '${purpose}' is not yet supported`);
      }
    }

    return {
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: `did:archethic:${address_hex}`,
      authentication: authentications,
      verificationMethod: verificationMethods
    };
  }

  /**
   * Use ec encryption on the seed for the list of authorizedPublicKeys
   * @param service Service name to identify the derivation path to use.
   * @param publicKeys List of public keys to encrypt the service seed.
   * @param pathSuffix Additional information to add to a service derivation path (default to empty).
   * @returns {Object} The encrypted secret and the list of authorized public keys with their encrypted secret key.
   * @throws {Error} If the authorized keys are not an array.
   * @throws {Error} If the service doesn't exist in the keychain.
   * @throws {Error} If the service derivation path has an index.
   * @example
   * ```ts
   * import Archethic, { Keychain, Crypto } from "@archethicjs/sdk";
   *
   * const archethic = new Archethic("http://testnet.archethic.net");
   * await archethic.connect();
   *
   * const keychain = new Keychain(Crypto.randomSecretKey()).addService("uco", "m/650'/uco");
   *
   * const storageNonce = await archethic.network.getStorageNoncePublicKey();
   *
   * const { secret, authorizedPublicKeys } = keychain.ecEncryptServiceSeed("uco", [storageNonce]);
   * // secret and authorizedPublicKeys can be used to create an ownership
   * const tx = archethic.transaction.new().addOwnership(secret, authorizedPublicKeys);
   * ```
   */
  ecEncryptServiceSeed(
    service: string,
    publicKeys: string[] | Uint8Array[],
    pathSuffix: string = ""
  ): ecEncryptServiceSeed {
    if (!Array.isArray(publicKeys)) {
      throw Error("Authorized keys must be an array");
    }

    if (!this.services[service]) {
      throw Error("Service doesn't exist in the keychain");
    }

    const { derivationPath } = this.services[service];

    if (isPathWithIndex(derivationPath)) {
      throw Error('Service should have a derivation path without index (removing the last "/0")');
    }

    const extendedSeed = deriveServiceSeed(this.seed, derivationPath, 0, pathSuffix);

    const aesKey = randomSecretKey();

    const secret = aesEncrypt(extendedSeed, aesKey);

    const authorizedPublicKeys = publicKeys.map((key) => {
      const uintKey = maybeHexToUint8Array(key);
      return {
        publicKey: uintKey,
        encryptedSecretKey: ecEncrypt(aesKey, uintKey)
      };
    });

    return { secret, authorizedPublicKeys };
  }

  /**
   * Converts the Keychain object to a JSON representation.
   * @returns The JSON representation of the Keychain object.
   */
  toJSON(): Object {
    const decodedKeys: { [key: string]: string | string[] } = {};
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        if (this[key] instanceof Uint8Array) {
          decodedKeys[key] = new TextDecoder().decode(this[key] as Uint8Array);
        } else if (Array.isArray(this[key])) {
          decodedKeys[key] = (this[key] as Uint8Array[]).map((value) => uint8ArrayToHex(value));
        } else {
          decodedKeys[key] = this[key] as string;
        }
      }
    }
    return JSON.stringify(decodedKeys);
  }
}

function deriveArchethicKeypair(
  seed: string | Uint8Array,
  derivationPath: string,
  index: number,
  curve: Curve = Curve.ed25519,
  pathSuffix: string = ""
): Keypair {
  const extendedSeed = deriveServiceSeed(seed, derivationPath, index, pathSuffix);

  return isPathWithIndex(derivationPath)
    ? generateDeterministicKeyPair(extendedSeed, curve, KEYCHAIN_ORIGIN_ID)
    : deriveKeyPair(extendedSeed, index, curve);
}

function deriveServiceSeed(seed: string | Uint8Array, derivationPath: string, index: number, pathSuffix: string = "") {
  seed = CryptoJS.lib.WordArray.create(maybeHexToUint8Array(seed));

  let hashedPath = "";
  if (isPathWithIndex(derivationPath)) {
    //Hash the derivation path
    hashedPath = CryptoJS.SHA256(replaceDerivationPathIndex(derivationPath, pathSuffix, index));
  } else {
    const path = derivationPath.split("/");
    // @ts-ignore
    const serviceName = path.pop().concat(pathSuffix);
    hashedPath = CryptoJS.SHA256(path.concat([serviceName]).join("/"));
  }

  return wordArrayToUint8Array(CryptoJS.HmacSHA512(hashedPath, seed)).subarray(0, 32);
}

function isPathWithIndex(path: string) {
  const servicePath: string[] = path.split("/");
  return servicePath.length === 4 && servicePath[3] === "0";
}

function replaceDerivationPathIndex(path: string, suffix: string, index: number): string {
  const servicePath: string[] = path.split("/").slice(0, -1);
  // @ts-ignore
  const serviceName = servicePath.pop().concat(suffix);
  return servicePath.concat([serviceName, `${index}`]).join("/");
}

/**
 * Convert a public key to a JWK
 * @param publicKey Public key to convert
 * @param keyID Key ID to set in the JWK
 * @returns {Object} The JWK
 * @internal
 */
export function keyToJWK(publicKey: Uint8Array, keyID: string): object | undefined {
  const curveID = publicKey[0];
  const key = publicKey.slice(2, publicKey.length);

  switch (curveID) {
    case 0:
      return {
        kty: "OKP",
        crv: "Ed25519",
        x: base64url(key),
        kid: keyID
      };
    case 1:
      return {
        kty: "EC",
        crv: "P-256",
        x: base64url(key.subarray(16)),
        y: base64url(key.subarray(-16)),
        kid: keyID
      };
    case 2:
      return {
        kty: "EC",
        crv: "secp256k1",
        x: base64url(key.subarray(16)),
        y: base64url(key.subarray(-16)),
        kid: keyID
      };
  }
}

function readByte(binary: Uint8Array, pos: number, size: number): { byte: number; pos: number } {
  return {
    byte: binary.slice(pos, pos + size)[0],
    pos: pos + size
  };
}

function readBytes(binary: Uint8Array, pos: number, size: number): { bytes: Uint8Array; pos: number } {
  return {
    bytes: binary.slice(pos, pos + size),
    pos: pos + size
  };
}
