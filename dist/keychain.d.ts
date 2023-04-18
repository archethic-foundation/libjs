import { Curve, HashAlgorithm, Keypair, Services } from "./types.js";
export default class Keychain {
    seed: Uint8Array;
    version: number;
    services: Services;
    authorizedPublicKeys: Uint8Array[];
    constructor(seed: string | Uint8Array, version?: number);
    addService(name: string, derivationPath: string, curve?: Curve, hashAlgo?: HashAlgorithm): this;
    removeService(name: string): this;
    addAuthorizedPublicKey(key: string | Uint8Array): this;
    removeAuthorizedPublicKey(key: string | Uint8Array): this;
    encode(): Uint8Array;
    static decode(binary: Uint8Array): Keychain;
    deriveKeypair(service: string, index?: number, pathSuffix?: string): Keypair;
    deriveAddress(service: string, index?: number, pathSuffix?: string): Uint8Array;
    toDID(): {
        "@context": string[];
        id: string;
        authentication: string[];
        verificationMethod: {
            id: string;
            type: string;
            publicKeyJwk: {
                kty: string;
                crv: string;
                x: string;
                kid: string;
                y?: undefined;
            } | {
                kty: string;
                crv: string;
                x: string;
                y: string;
                kid: string;
            } | undefined;
            controller: string;
        }[];
    };
}
export declare function keyToJWK(publicKey: Uint8Array, keyID: string): {
    kty: string;
    crv: string;
    x: string;
    kid: string;
    y?: undefined;
} | {
    kty: string;
    crv: string;
    x: string;
    y: string;
    kid: string;
} | undefined;
