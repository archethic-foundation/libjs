import { Curve, HashAlgorithm } from "./types.js";
import { concatUint8Arrays, hexToUint8Array, intToUint8Array, maybeHexToUint8Array, maybeStringToUint8Array, uint8ArrayToHex, wordArrayToUint8Array } from "./utils.js";
import * as curve25519 from 'curve25519-js';
import CryptoJS from "crypto-js";
import blake from 'blakejs';
import nacl from 'tweetnacl';
import pkg from 'elliptic';
const { ec } = pkg;
import sha3 from 'js-sha3';
import ed2curve from 'ed2curve';
import sjcl from 'sjcl';
const { sha3_512, sha3_256 } = sha3;
const EC = ec;
const ec_P256 = new EC("p256");
const ec_secp256k1 = new EC("secp256k1");
const SOFTWARE_ID = 1;
export function randomSecretKey() {
    return wordArrayToUint8Array(CryptoJS.lib.WordArray.random(32));
}
export function hashAlgoToId(hashAlgo) {
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
export function IDToHashAlgo(ID) {
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
export function hashAlgoToID(hashAlgo) {
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
export function getHashDigest(content, algo) {
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
export function hash(content, algo = HashAlgorithm.sha256) {
    content = maybeStringToUint8Array(content);
    const algoID = hashAlgoToID(algo);
    const digest = getHashDigest(content, algo);
    return concatUint8Arrays(Uint8Array.from([algoID]), Uint8Array.from(digest));
}
export function curveToID(curve) {
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
export function IDToCurve(ID) {
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
export function derivePrivateKey(seed, index) {
    seed = CryptoJS.lib.WordArray.create(maybeStringToUint8Array(seed));
    const hash = wordArrayToUint8Array(CryptoJS.SHA512(seed));
    const masterKey = hash.subarray(0, 32);
    const masterEntropy = hash.subarray(32, 64);
    const indexBuf = intToUint8Array(index);
    const extendedSeed = concatUint8Arrays(masterKey, indexBuf);
    const hmacWordArray = CryptoJS.HmacSHA512(CryptoJS.lib.WordArray.create(extendedSeed), CryptoJS.lib.WordArray.create(masterEntropy));
    return wordArrayToUint8Array(hmacWordArray).subarray(0, 32);
}
export function deriveKeyPair(seed, index = 0, curve = Curve.ed25519) {
    if (index < 0) {
        throw "'index' must be a positive number";
    }
    const pvBuf = derivePrivateKey(seed, index);
    return generateDeterministicKeyPair(pvBuf, curve, SOFTWARE_ID);
}
export function deriveAddress(seed, index, curve = Curve.ed25519, hashAlgo = HashAlgorithm.sha256) {
    seed = maybeStringToUint8Array(seed);
    const { publicKey } = deriveKeyPair(seed, index, curve);
    const curveID = curveToID(curve);
    const hashedPublicKey = hash(publicKey, hashAlgo);
    return concatUint8Arrays(Uint8Array.from([curveID]), Uint8Array.from(hashedPublicKey));
}
export function generateDeterministicKeyPair(pvKey, curve, originID) {
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
function getKeypair(pvKey, curve) {
    if (typeof pvKey === "string") {
        pvKey = hexToUint8Array(pvKey);
    }
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
export function sign(data, privateKey) {
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
export function verify(sig, data, publicKey) {
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
export function ecEncrypt(data, publicKey) {
    publicKey = maybeStringToUint8Array(publicKey);
    data = maybeStringToUint8Array(data);
    const curveBuf = publicKey.slice(0, 1);
    const pubBuf = publicKey.slice(2, publicKey.length);
    const curve = curveBuf[0];
    switch (curve) {
        case 0: {
            const { public: ephemeralPublicKey, private: ephemeralPrivateKey } = curve25519.generateKeyPair(randomSecretKey());
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
export function ecDecrypt(ciphertext, privateKey) {
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
export function aesEncrypt(data, key) {
    key = maybeHexToUint8Array(key);
    data = maybeStringToUint8Array(data);
    const iv = wordArrayToUint8Array(CryptoJS.lib.WordArray.random(12));
    const { tag: tag, encrypted: encrypted } = aesAuthEncrypt(data, key, iv);
    return concatUint8Arrays(new Uint8Array(iv), tag, encrypted);
}
export function aesDecrypt(cipherText, key) {
    cipherText = maybeHexToUint8Array(cipherText);
    key = maybeHexToUint8Array(key);
    const iv = cipherText.slice(0, 12);
    const tag = cipherText.slice(12, 12 + 16);
    const encrypted = cipherText.slice(28, cipherText.length);
    return aesAuthDecrypt(encrypted, key, iv, tag);
}
function deriveSecret(sharedKey) {
    sharedKey = CryptoJS.lib.WordArray.create(sharedKey);
    const pseudoRandomKey = CryptoJS.SHA256(sharedKey);
    const iv = wordArrayToUint8Array(CryptoJS.HmacSHA256("0", pseudoRandomKey)).subarray(0, 32);
    const aesKey = wordArrayToUint8Array(CryptoJS.HmacSHA256("1", CryptoJS.lib.WordArray.create(iv))).subarray(0, 32);
    return { aesKey, iv };
}
function aesAuthEncrypt(data, aesKey, iv) {
    const keyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey));
    const dataBits = sjcl.codec.hex.toBits(uint8ArrayToHex(data));
    const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv));
    const { tag, data: encrypted } = sjcl.mode.gcm.C(true, new sjcl.cipher.aes(keyBits), dataBits, [], ivBits, 128);
    return {
        encrypted: hexToUint8Array(sjcl.codec.hex.fromBits(encrypted)),
        tag: hexToUint8Array(sjcl.codec.hex.fromBits(tag))
    };
}
function aesAuthDecrypt(encrypted, aesKey, iv, tag) {
    const encryptedBits = sjcl.codec.hex.toBits(uint8ArrayToHex(encrypted));
    const aesKeyBits = sjcl.codec.hex.toBits(uint8ArrayToHex(aesKey));
    const ivBits = sjcl.codec.hex.toBits(uint8ArrayToHex(iv));
    const tagBits = sjcl.codec.hex.toBits(uint8ArrayToHex(tag));
    const { tag: actualTag, data: decrypted } = sjcl.mode.gcm.C(false, new sjcl.cipher.aes(aesKeyBits), encryptedBits, [], ivBits, 128);
    if (!sjcl.bitArray.equal(actualTag, tagBits)) {
        throw "Invalid tag";
    }
    return hexToUint8Array(sjcl.codec.hex.fromBits(decrypted));
}
//# sourceMappingURL=crypto.js.map