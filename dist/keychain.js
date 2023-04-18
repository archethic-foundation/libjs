import { base64url, concatUint8Arrays, intToUint8Array, maybeHexToUint8Array, uint8ArrayToHex, uint8ArrayToInt, wordArrayToUint8Array } from "./utils.js";
import { Curve, HashAlgorithm } from "./types.js";
import { curveToID, deriveAddress, generateDeterministicKeyPair, hash, hashAlgoToID, IDToCurve, IDToHashAlgo } from "./crypto.js";
import * as CryptoJS from "crypto-js";
const KEYCHAIN_ORIGIN_ID = 0;
export default class Keychain {
    seed;
    version;
    services;
    authorizedPublicKeys;
    constructor(seed, version = 1) {
        if (typeof seed === "string") {
            this.seed = new TextEncoder().encode(seed);
        }
        else {
            this.seed = seed;
        }
        this.version = version;
        this.services = {};
        this.authorizedPublicKeys = [];
    }
    addService(name, derivationPath, curve = Curve.ed25519, hashAlgo = HashAlgorithm.sha256) {
        this.services[name] = {
            derivationPath: derivationPath,
            curve: curve,
            hashAlgo: hashAlgo,
        };
        return this;
    }
    removeService(name) {
        delete this.services[name];
        return this;
    }
    addAuthorizedPublicKey(key) {
        key = maybeHexToUint8Array(key);
        this.removeAuthorizedPublicKey(key);
        this.authorizedPublicKeys.push(key);
        return this;
    }
    removeAuthorizedPublicKey(key) {
        this.authorizedPublicKeys = this.authorizedPublicKeys.filter(k => {
            return uint8ArrayToHex(k) != uint8ArrayToHex(maybeHexToUint8Array(key));
        });
        return this;
    }
    encode() {
        let servicesBuffer = [];
        for (let service in this.services) {
            const { derivationPath, curve, hashAlgo } = this.services[service];
            servicesBuffer.push(concatUint8Arrays(Uint8Array.from([service.length]), new TextEncoder().encode(service), Uint8Array.from([derivationPath.length]), new TextEncoder().encode(derivationPath), Uint8Array.from([curveToID(curve)]), Uint8Array.from([hashAlgoToID(hashAlgo)])));
        }
        return concatUint8Arrays(intToUint8Array(this.version), Uint8Array.from([this.seed.length]), this.seed, Uint8Array.from([Object.keys(this.services).length]), concatUint8Arrays(...servicesBuffer));
    }
    static decode(binary) {
        var { bytes: version, pos: versionPos } = readBytes(binary, 0, 4);
        var { byte: seedSize, pos: seedSizePos } = readByte(binary, versionPos, 1);
        var { bytes: seed, pos: seedPos } = readBytes(binary, seedSizePos, seedSize);
        var { byte: nbServices, pos: nbServicesPos } = readByte(binary, seedPos, 1);
        let keychain = new Keychain(seed, uint8ArrayToInt(version));
        for (let i = 0; i < nbServices; i++) {
            var { byte: serviceNameLength, pos: serviceNameLengthPos } = readByte(binary, nbServicesPos, 1);
            var { bytes: serviceName, pos: serviceNamePos } = readBytes(binary, serviceNameLengthPos, serviceNameLength);
            var { byte: derivationPathLength, pos: derivationPathLengthPos } = readByte(binary, serviceNamePos, 1);
            var { bytes: derivationPath, pos: derivationPathPos } = readBytes(binary, derivationPathLengthPos, derivationPathLength);
            var { byte: curveID, pos: curveIDPos } = readByte(binary, derivationPathPos, 1);
            var { byte: hashAlgoID, pos: hashAlgoIDPos } = readByte(binary, curveIDPos, 1);
            const serviceNameString = new TextDecoder().decode(serviceName);
            const derivationPathString = new TextDecoder().decode(derivationPath);
            keychain.addService(serviceNameString, derivationPathString, IDToCurve(curveID), IDToHashAlgo(hashAlgoID));
            nbServicesPos = hashAlgoIDPos;
        }
        return keychain;
    }
    deriveKeypair(service, index = 0, pathSuffix = "") {
        if (!this.services[service]) {
            throw "Service doesn't exist in the keychain";
        }
        if (index < 0) {
            throw "'index' must be a positive number";
        }
        const { derivationPath, curve } = this.services[service];
        return deriveArchethicKeypair(this.seed, derivationPath, index, curve, pathSuffix);
    }
    deriveAddress(service, index = 0, pathSuffix = "") {
        if (!this.services[service]) {
            throw "Service doesn't exist in the keychain";
        }
        if (index < 0) {
            throw "'index' must be a positive number";
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
            if (purpose == "650") {
                const { publicKey } = deriveArchethicKeypair(this.seed, derivationPath, 0, curve);
                verificationMethods.push({
                    id: `did:archethic:${address_hex}#${service}`,
                    type: "JsonWebKey2020",
                    publicKeyJwk: keyToJWK(publicKey, service),
                    controller: `did:archethic:${address_hex}`,
                });
                authentications.push(`did:archethic:${address_hex}#${service}`);
            }
            else {
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
function deriveArchethicKeypair(seed, derivationPath, index, curve = Curve.ed25519, pathSuffix = "") {
    seed = CryptoJS.lib.WordArray.create(maybeHexToUint8Array(seed));
    const hashedPath = CryptoJS.SHA256(replaceDerivationPathIndex(derivationPath, pathSuffix, index));
    const extendedSeed = wordArrayToUint8Array(CryptoJS.HmacSHA512(hashedPath, seed))
        .subarray(0, 32);
    return generateDeterministicKeyPair(extendedSeed, curve, KEYCHAIN_ORIGIN_ID);
}
function replaceDerivationPathIndex(path, suffix, index) {
    let servicePath = path.split("/").slice(0, -1);
    const serviceName = servicePath.pop().concat(suffix);
    return servicePath.concat([serviceName, `${index}`]).join("/");
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
            return {
                kty: "EC",
                crv: "P-256",
                x: base64url(key.subarray(16)),
                y: base64url(key.subarray(-16)),
                kid: keyID,
            };
        case 2:
            return {
                kty: "EC",
                crv: "secp256k1",
                x: base64url(key.subarray(16)),
                y: base64url(key.subarray(-16)),
                kid: keyID,
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
//# sourceMappingURL=keychain.js.map