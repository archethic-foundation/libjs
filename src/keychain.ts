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
import {
    curveToID,
    deriveAddress,
    generateDeterministicKeyPair,
    hash,
    hashAlgoToID,
    IDToCurve,
    IDToHashAlgo
} from "./crypto.js";
// @ts-ignore
import * as CryptoJS from "crypto-js";

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
    addService(name: string, derivationPath: string, curve: Curve = Curve.ed25519, hashAlgo: HashAlgorithm = HashAlgorithm.sha256) {
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
        this.authorizedPublicKeys = this.authorizedPublicKeys.filter(k => {
            // javascript can't compare objects so we compare strings
            return uint8ArrayToHex(k) != uint8ArrayToHex(maybeHexToUint8Array(key));
        });
        return this;
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
                    Uint8Array.from([hashAlgoToID(hashAlgo)]),
                )
            );
        }

        return concatUint8Arrays(
            intToUint8Array(this.version),
            Uint8Array.from([this.seed.length]),
            this.seed,
            Uint8Array.from([Object.keys(this.services).length]),
            concatUint8Arrays(...servicesBuffer),
        );
    }

    /**
     * Decode a keychain from a binary
     * @param binary {Uint8Array}
     */
    static decode(binary: Uint8Array) {

        var { bytes: version, pos: versionPos } = readBytes(binary, 0, 4);
        var { byte: seedSize, pos: seedSizePos } = readByte(binary, versionPos, 1);
        var { bytes: seed, pos: seedPos } = readBytes(binary, seedSizePos, seedSize);
        var { byte: nbServices, pos: nbServicesPos } = readByte(binary, seedPos, 1);

        let keychain = new Keychain(seed, uint8ArrayToInt(version));

        for (let i = 0; i < nbServices; i++) {
            var { byte: serviceNameLength, pos: serviceNameLengthPos } = readByte(binary, nbServicesPos, 1);
            var { bytes: serviceName, pos: serviceNamePos } = readBytes(
                binary,
                serviceNameLengthPos,
                serviceNameLength
            );
            var { byte: derivationPathLength, pos: derivationPathLengthPos } = readByte(binary, serviceNamePos, 1);
            var { bytes: derivationPath, pos: derivationPathPos } = readBytes(
                binary,
                derivationPathLengthPos,
                derivationPathLength
            );
            var { byte: curveID, pos: curveIDPos } = readByte(binary, derivationPathPos, 1);
            var { byte: hashAlgoID, pos: hashAlgoIDPos } = readByte(binary, curveIDPos, 1);

            const serviceNameString = new TextDecoder().decode(serviceName);
            const derivationPathString = new TextDecoder().decode(derivationPath);

            keychain.addService(
                serviceNameString,
                derivationPathString,
                IDToCurve(curveID),
                IDToHashAlgo(hashAlgoID)
            );
            nbServicesPos = hashAlgoIDPos;
        }
        return keychain;
    }

    deriveKeypair(service: string, index: number = 0, pathSuffix: string = "") {
        if (!this.services[service]) {
            throw "Service doesn't exist in the keychain";
        }

        if (index < 0) {
            throw "'index' must be a positive number"
        }

        const { derivationPath, curve } = this.services[service];
        return deriveArchethicKeypair(this.seed, derivationPath, index, curve, pathSuffix);
    }

    deriveAddress(service: string, index: number = 0, pathSuffix: string = "") {
        if (!this.services[service]) {
            throw "Service doesn't exist in the keychain";
        }

        if (index < 0) {
            throw "'index' must be a positive number"
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

        return concatUint8Arrays(
            Uint8Array.from([curveID]),
            Uint8Array.from(hashedPublicKey),
        );
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



function deriveArchethicKeypair(
    seed: string | Uint8Array,
    derivationPath: string,
    index: number,
    curve: Curve = Curve.ed25519,
    pathSuffix: string = ""
): Keypair {

    seed = CryptoJS.lib.WordArray.create(maybeHexToUint8Array(seed))

    //Hash the derivation path
    const hashedPath = CryptoJS.SHA256(replaceDerivationPathIndex(derivationPath, pathSuffix, index))
    const extendedSeed = wordArrayToUint8Array(CryptoJS.HmacSHA512(hashedPath, seed))
        .subarray(0, 32)

    return generateDeterministicKeyPair(extendedSeed, curve, KEYCHAIN_ORIGIN_ID);
}


function replaceDerivationPathIndex(path: string, suffix: string, index: number): string {
    let servicePath: string[] = path.split("/").slice(0, -1)
    // @ts-ignore
    const serviceName = servicePath.pop().concat(suffix)
    return servicePath.concat([serviceName, `${index}`]).join("/")
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

function readByte(binary: Uint8Array, pos: number, size: number): { byte: number; pos: number } {
    return {
        byte: binary.slice(pos, pos + size)[0],
        pos: pos + size,
    };
}
function readBytes(binary: Uint8Array, pos: number, size: number): { bytes: Uint8Array; pos: number } {
    return {
        bytes: binary.slice(pos, pos + size),
        pos: pos + size,
    };
}