import {
  generateDeterministicKeyPair,
  deriveAddress,
  hash,
  curveToID,
  hashAlgoToID,
  IDToCurve,
  IDToHashAlgo,
  sign
} from "./crypto.js";

import {
  uint8ArrayToHex,
  concatUint8Arrays,
  encodeInt32,
  decodeInt32,
  maybeHexToUint8Array,
  wordArrayToUint8Array
} from "./utils.js";

import CryptoJS from 'crypto-js';

import { encode as base64url } from "universal-base64url";

const KEYCHAIN_ORIGIN_ID = 0;

export default class Keychain {
  constructor(seed, version = 1) {
    if (!(seed instanceof Uint8Array)) {
      seed = new TextEncoder().encode(seed);
    }

    this.version = version;
    this.seed = seed;
    this.services = {};
    this.authorizedPublicKeys = [];
  }

  /**
   * Add a service to the keychain
   * 
   * @param {String} name 
   * @param {String} derivationPath 
   * @param {String} curve 
   * @param {String} hashAlgo 
   */
  addService(name, derivationPath, curve = "ed25519", hashAlgo = "sha256") {
    this.services[name] = {
      derivationPath: derivationPath,
      curve: curve,
      hashAlgo: hashAlgo,
    };
    return this;
  }

  /**
   * Remove a service from the keychain
   * @param {String} name    
   */
  removeService(name) {
    delete this.services[name];
    return this;
  }

  /**
   * Add a public key to the authorized public keys list
   * 
   * @param {String | Uint8Array} key 
   */
  addAuthorizedPublicKey(key) {
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
  removeAuthorizedPublicKey(key) {
    key = maybeHexToUint8Array(key);

    this.authorizedPublicKeys = this.authorizedPublicKeys.filter(k => {
      // javascript can't compare objects so we compare strings
      return uint8ArrayToHex(k) != uint8ArrayToHex(key);
    });
    return this;
  }

  /**
   * Encode the keychain
   */
  encode() {
    let servicesBuffer = [];
    for (let service in this.services) {
      const { derivationPath, curve, hashAlgo } = this.services[service];
      servicesBuffer.push(
        concatUint8Arrays([
          Uint8Array.from([service.length]),
          new TextEncoder().encode(service),
          Uint8Array.from([derivationPath.length]),
          new TextEncoder().encode(derivationPath),
          Uint8Array.from([curveToID(curve)]),
          Uint8Array.from([hashAlgoToID(hashAlgo)]),
        ])
      );
    }

    return concatUint8Arrays([
      encodeInt32(this.version),
      Uint8Array.from([this.seed.length]),
      this.seed,
      Uint8Array.from([Object.keys(this.services).length]),
      concatUint8Arrays(servicesBuffer),
    ]);
  }

  deriveKeypair(service, index = 0, pathSuffix = "") {
    if (!this.services[service]) {
      throw "Service doesn't exist in the keychain";
    }

    if (typeof index !== 'number' || index < 0) {
      throw "'index' must be a positive number"
    }

    if (typeof (pathSuffix) !== "string") {
      throw "'suffix must be a string"
    }

    const { derivationPath, curve } = this.services[service];
    return deriveArchethicKeypair(this.seed, derivationPath, index, curve, pathSuffix);
  }

  deriveAddress(service, index = 0, pathSuffix = "") {
    if (!this.services[service]) {
      throw "Service doesn't exist in the keychain";
    }

    if (typeof index !== 'number' || index < 0) {
      throw "'index' must be a positive number"
    }

    if (typeof (pathSuffix) !== "string") {
      throw "'suffix must be a string"
    }

    const { derivationPath, curve, hashAlgo } = this.services[service];
    const { publicKey } = deriveArchethicKeypair(
      this.seed,
      derivationPath,
      index,
      curve,
      pathSuffix
    );
    const curveID = curveToID(curve);

    const hashedPublicKey = hash(publicKey, hashAlgo);

    return concatUint8Arrays([
      Uint8Array.from([curveID]),
      Uint8Array.from(hashedPublicKey),
    ]);
  }

  buildTransaction(tx, service, index, suffix = "") {

    if (typeof tx !== "object") {
      throw "'tx' must be an instance of TransactionBuilder";
    }

    if (!this.services[service]) {
      throw "Service doesn't exist in the keychain";
    }

    if (typeof index !== 'number' || index < 0) {
      throw "'index' must be a positive number"
    }

    if (typeof (suffix) !== "string") {
      throw "'suffix must be a string"
    }

    const keypair = this.deriveKeypair(service, index, suffix);
    const address = this.deriveAddress(service, index + 1, suffix);

    tx.setAddress(address);

    const payloadForPreviousSignature = tx.previousSignaturePayload();
    const previousSignature = sign(
      payloadForPreviousSignature,
      keypair.privateKey
    );

    tx.setPreviousSignatureAndPreviousPublicKey(
      previousSignature,
      keypair.publicKey
    );

    return tx;
  }

  static decode(binary) {
    var pos = 0;

    var { bytes: version, pos: pos } = readBytes(binary, pos, 4);
    var { byte: seedSize, pos: pos } = readByte(binary, pos, 1);
    var { bytes: seed, pos: pos } = readBytes(binary, pos, seedSize);
    var { byte: nbServices, pos: pos } = readByte(binary, pos, 1);

    let keychain = new Keychain(seed, decodeInt32(version));

    for (let i = 0; i < nbServices; i++) {
      var { byte: serviceNameLength, pos: pos } = readByte(binary, pos, 1);
      var { bytes: serviceName, pos: pos } = readBytes(
        binary,
        pos,
        serviceNameLength
      );
      var { byte: derivationPathLength, pos: pos } = readByte(binary, pos, 1);
      var { bytes: derivationPath, pos: pos } = readBytes(
        binary,
        pos,
        derivationPathLength
      );
      var { byte: curveID, pos: pos } = readByte(binary, pos, 1);
      var { byte: hashAlgoID, pos: pos } = readByte(binary, pos, 1);

      serviceName = new TextDecoder().decode(serviceName);
      derivationPath = new TextDecoder().decode(derivationPath);

      keychain.addService(
        serviceName,
        derivationPath,
        IDToCurve(curveID),
        IDToHashAlgo(hashAlgoID)
      );
    }

    return keychain;
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
        const { publicKey } = deriveArchethicKeypair(
          this.seed,
          derivationPath,
          0,
          curve
        );

        verificationMethods.push({
          id: `did:archethic:${address_hex}#${service}`,
          type: "JsonWebKey2020",
          publicKeyJwk: keyToJWK(publicKey, service),
          controller: `did:archethic:${address_hex}`,
        });

        authentications.push(`did:archethic:${address_hex}#${service}`);
      } else {
        throw "Purpose '" + purpose + "' is not yet supported";
      }
    }


    return {
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: `did:archethic:${address_hex}`,
      authentication: authentications,
      verificationMethod: verificationMethods,
    };
  }
}

function readByte(binary, pos, size) {
  return {
    byte: binary.slice(pos, pos + size)[0],
    pos: pos + size,
  };
}

function readBytes(binary, pos, size) {
  return {
    bytes: binary.slice(pos, pos + size),
    pos: pos + size,
  };
}

function deriveArchethicKeypair(
  seed,
  derivationPath,
  index,
  curve = "ed25519",
  pathSuffix = ""
) {

  seed = CryptoJS.lib.WordArray.create(maybeHexToUint8Array(seed))

  //Hash the derivation path
  const hashedPath = CryptoJS.SHA256(replaceDerivationPathIndex(derivationPath, pathSuffix, index))
  const extendedSeed = wordArrayToUint8Array(CryptoJS.HmacSHA512(hashedPath, seed))
    .subarray(0, 32)

  return generateDeterministicKeyPair(extendedSeed, curve, KEYCHAIN_ORIGIN_ID);
}

function replaceDerivationPathIndex(path, suffix, index) {
  let servicePath = path.split("/").slice(0, -1) 
  const serviceName = servicePath.pop().concat(suffix)
  return servicePath.concat([serviceName, `${index}`]).join("/")
}

export function keyToJWK(publicKey, keyID) {
  const curveID = publicKey[0];
  const key = publicKey.slice(2, publicKey.length);

  switch (curveID) {
    case 0:
      return {
        kty: "OKP",
        crv: "Ed25519",
        x: base64url(key),
        kid: keyID,
      };
    case 1:
      x = key.subarray(16);
      y = key.subarray(-16);

      return {
        kty: "EC",
        crv: "P-256",
        x: base64url(x),
        y: base64url(y),
        kid: keyID,
      };
    case 2:
      x = key.subarray(16);
      y = key.subarray(-16);

      return {
        kty: "EC",
        crv: "secp256k1",
        x: base64url(x),
        y: base64url(y),
        kid: keyID,
      };
  }
}
