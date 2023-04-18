import { Buffer } from "buffer";
export const originPrivateKey = "01019280BDB84B8F8AEDBA205FE3552689964A5626EE2C60AA10E3BF22A91A036009";
export function wordArrayToUint8Array(wordArray) {
    const dataArray = new Uint8Array(wordArray.sigBytes);
    for (let i = 0x0; i < wordArray.sigBytes; i++) {
        dataArray[i] = wordArray.words[i >>> 0x2] >>> 0x18 - i % 0x4 * 0x8 & 0xff;
    }
    return new Uint8Array(dataArray);
}
export function isHex(str) {
    return /^[0-9a-fA-F]+$/.test(str);
}
export function hexToUint8Array(str) {
    if (!isHex(str)) {
        throw new Error("Invalid hex string");
    }
    return new Uint8Array(str.match(/.{1,2}/g).map(byte => parseInt(byte, 0x10)));
}
export function maybeStringToUint8Array(str) {
    if (typeof str === "string") {
        if (isHex(str)) {
            str = hexToUint8Array(str);
        }
        else {
            str = new TextEncoder().encode(str);
        }
    }
    return str;
}
export function maybeHexToUint8Array(str) {
    if (typeof str === "string") {
        if (isHex(str)) {
            str = hexToUint8Array(str);
        }
        else {
            throw new Error("Invalid hex string");
        }
    }
    return str;
}
export function maybeUint8ArrayToHex(bytes) {
    if (bytes instanceof Uint8Array) {
        return uint8ArrayToHex(bytes);
    }
    return bytes;
}
export function intToUint8Array(int) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0x0, int, true);
    return new Uint8Array(buffer).reverse();
}
export function bigIntToUint8Array(number) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0x0, BigInt(number), true);
    return new Uint8Array(buffer).reverse();
}
export function uint8ArrayToInt(bytes) {
    let value = 0;
    for (let i = 0; i < bytes.length; i++) {
        value = (value * 256) + bytes[i];
    }
    return value;
}
export function toBigInt(number, decimal = 8) {
    return Math.trunc(number * Math.pow(10, decimal));
}
export function fromBigInt(number, decimal = 8) {
    return number / Math.pow(10, decimal);
}
export function concatUint8Arrays(...arrays) {
    let totalLength = 0;
    for (let arr of arrays) {
        totalLength += arr.length;
    }
    let result = new Uint8Array(totalLength);
    let offset = 0;
    for (let arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
export function uint8ArrayToHex(bytes) {
    return Buffer.from(bytes).toString("hex");
}
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export function base64url(arraybuffer) {
    let bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = "";
    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }
    if ((len % 3) === 2) {
        base64 = base64.substring(0, base64.length - 1);
    }
    else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2);
    }
    return base64;
}
export function toByteArray(number) {
    if (!number)
        return Uint8Array.from([0]);
    const a = [];
    a.unshift(number & 255);
    while (number >= 256) {
        number = number >>> 8;
        a.unshift(number & 255);
    }
    return Uint8Array.from(a);
}
//# sourceMappingURL=utils.js.map