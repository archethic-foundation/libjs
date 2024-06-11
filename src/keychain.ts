import {
  base64url,
  concatUint8Arrays,
  intToUint8Array,
  maybeHexToUint8Array,
  uint8ArrayToHex,
  uint8ArrayToInt,
  wordArrayToUint8Array
} from "./utils.js";
import { Curve, HashAlgorithm, Keypair, Services } from "./types.js";
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
   * Add a service to the keychain
   *
   * @param {String} name
   * @param {String} derivationPath
   * @param {Curve} curve
   * @param {HashAlgorithm} hashAlgo
   */
  addService(
    name: string,
    derivationPath: string,
    curve: Curve = Curve.ed25519,
    hashAlgo: HashAlgorithm = HashAlgorithm.sha256
  ) {
    this.services[name] = {
      derivationPath: derivationPath,
      curve: curve,
      hashAlgo: hashAlgo
    };
    return this;
  }

  /**
   * Remove a service from the keychain
   * @param {String} name
   */
  removeService(name: string) {
    delete this.services[name];
    return this;
  }

  /**
   * Add a public key to the authorized public keys list
   *
   * @param {String | Uint8Array} key
   */
  addAuthorizedPublicKey(key: string | Uint8Array) {
    key = maybeHexToUint8Array(key);

    // prevent duplicate
    this.removeAuthorizedPublicKey(key);

    this.authorizedPublicKeys.push(key);
    return this;
  }

  /**
   * Remove a public key from the authorized public keys list
   *
   * @param {String | Uint8Array} key
   */
  removeAuthorizedPublicKey(key: string | Uint8Array) {
    this.authorizedPublicKeys = this.authorizedPublicKeys.filter((k) => {
      // javascript can't compare objects so we compare strings
      return uint8ArrayToHex(k) != uint8ArrayToHex(maybeHexToUint8Array(key));
    });
    return this;
  }

  buildTransaction(tx: TransactionBuilder, service: string, index: number, suffix: string = "") {
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
   */
  encode(): Uint8Array {
    let servicesBuffer = [];
    for (let service in this.services) {
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
   */
  static decode(binary: Uint8Array) {
    let { bytes: version, pos: versionPos } = readBytes(binary, 0, 4);
    let { byte: seedSize, pos: seedSizePos } = readByte(binary, versionPos, 1);
    let { bytes: seed, pos: seedPos } = readBytes(binary, seedSizePos, seedSize);
    let { byte: nbServices, pos: nbServicesPos } = readByte(binary, seedPos, 1);

    let keychain = new Keychain(seed, uint8ArrayToInt(version));

    for (let i = 0; i < nbServices; i++) {
      let { byte: serviceNameLength, pos: serviceNameLengthPos } = readByte(binary, nbServicesPos, 1);
      let { bytes: serviceName, pos: serviceNamePos } = readBytes(binary, serviceNameLengthPos, serviceNameLength);
      let { byte: derivationPathLength, pos: derivationPathLengthPos } = readByte(binary, serviceNamePos, 1);
      let { bytes: derivationPath, pos: derivationPathPos } = readBytes(
        binary,
        derivationPathLengthPos,
        derivationPathLength
      );
      let { byte: curveID, pos: curveIDPos } = readByte(binary, derivationPathPos, 1);
      let { byte: hashAlgoID, pos: hashAlgoIDPos } = readByte(binary, curveIDPos, 1);

      const serviceNameString = new TextDecoder().decode(serviceName);
      const derivationPathString = new TextDecoder().decode(derivationPath);

      keychain.addService(serviceNameString, derivationPathString, IDToCurve(curveID), IDToHashAlgo(hashAlgoID));
      nbServicesPos = hashAlgoIDPos;
    }
    return keychain;
  }

  deriveKeypair(service: string, index: number = 0, pathSuffix: string = "") {
    if (!this.services[service]) {
      throw Error("Service doesn't exist in the keychain");
    }

    if (index < 0) {
      throw Error("'index' must be a positive number");
    }

    const { derivationPath, curve } = this.services[service];
    return deriveArchethicKeypair(this.seed, derivationPath, index, curve, pathSuffix);
  }

  deriveAddress(service: string, index: number = 0, pathSuffix: string = "") {
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

  toDID() {
    const address = deriveAddress(this.seed, 0);
    const address_hex = uint8ArrayToHex(address);

    let verificationMethods = [];
    let authentications = [];

    for (let service in this.services) {
      const { derivationPath, curve } = this.services[service];

      const purpose = derivationPath
        .split("/")
        .map((v) => v.replace("'", ""))
        .at(1);

      //Only support of archethic derivation scheme for now
      if (purpose == "650") {
        const { publicKey } = deriveArchethicKeypair(this.seed, derivationPath, 0, curve);

        verificationMethods.push({
          id: `did:archethic:${address_hex}#${service}`,
          type: "JsonWebKey2020",
          publicKeyJwk: keyToJWK(publicKey, service),
          controller: `did:archethic:${address_hex}`
        });

        authentications.push(`did:archethic:${address_hex}#${service}`);
      } else {
        throw Error("Purpose '" + purpose + "' is not yet supported");
      }
    }

    return {
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: `did:archethic:${address_hex}`,
      authentication: authentications,
      verificationMethod: verificationMethods
    };
  }

  ecEncryptServiceSeed(service: string, publicKeys: string[] | Uint8Array[], pathSuffix: string = "") {
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
  let servicePath: string[] = path.split("/");
  return servicePath.length == 4 && servicePath[3] == "0";
}

function replaceDerivationPathIndex(path: string, suffix: string, index: number): string {
  let servicePath: string[] = path.split("/").slice(0, -1);
  // @ts-ignore
  const serviceName = servicePath.pop().concat(suffix);
  return servicePath.concat([serviceName, `${index}`]).join("/");
}

export function keyToJWK(publicKey: Uint8Array, keyID: string) {
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
