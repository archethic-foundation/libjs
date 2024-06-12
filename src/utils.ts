// @ts-ignore
import CoreJSON from "core-js-pure/actual/json";

/**
 *
 * Return the Initial Origin Private Key
 */
export const originPrivateKey = "01019280BDB84B8F8AEDBA205FE3552689964A5626EE2C60AA10E3BF22A91A036009";

/**
 * Convert CryptoJS.lib.WordArray to Uint8Array
 */
export function wordArrayToUint8Array(wordArray: { sigBytes: number; words: number[] }): Uint8Array {
  const dataArray = new Uint8Array(wordArray.sigBytes);
  for (let i = 0x0; i < wordArray.sigBytes; i++) {
    dataArray[i] = (wordArray.words[i >>> 0x2] >>> (0x18 - (i % 0x4) * 0x8)) & 0xff;
  }
  return new Uint8Array(dataArray);
}

/**
 * Check if a string is a valid hex string
 * @param str
 */
export function isHex(str: string) {
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Check if given variable is an object
 * @param variable
 */
export function isObject(variable: any) {
  return typeof variable === "object" && !Array.isArray(variable) && variable !== null;
}

export function sortObjectKeysASC(term: any): any {
  // array: map over elements
  if (Array.isArray(term)) return term.map((item: any) => sortObjectKeysASC(item));

  if (term instanceof Map) {
    const sortedEntries = [...term.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const sortedMap = new Map(sortedEntries.map(([key, value]) => [key, sortObjectKeysASC(value)]));
    return sortedMap;
  }

  // object: sort and map over elements
  if (isObject(term))
    return Object.keys(term)
      .sort((a, b) => a.localeCompare(b))
      .reduce((newObj: any, key: string) => {
        newObj[key] = sortObjectKeysASC(term[key]);
        return newObj;
      }, {});

  return term;
}

/**
 * Convert a hex string to a Uint8Array
 * @param str
 */
export function hexToUint8Array(str: string): Uint8Array {
  if (!isHex(str)) {
    throw new Error("Invalid hex string");
  }
  return new Uint8Array(str.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 0x10)));
}

export function maybeStringToUint8Array(str: string | Uint8Array): Uint8Array {
  if (typeof str === "string") {
    if (isHex(str)) {
      str = hexToUint8Array(str);
    } else {
      str = new TextEncoder().encode(str);
    }
  }
  return str;
}

export function maybeHexToUint8Array(str: string | Uint8Array): Uint8Array {
  if (typeof str === "string") {
    if (isHex(str)) {
      str = hexToUint8Array(str);
    } else {
      throw new Error("Invalid hex string");
    }
  }
  return str;
}

export function maybeUint8ArrayToHex(bytes: Uint8Array | string): string {
  if (bytes instanceof Uint8Array) {
    return uint8ArrayToHex(bytes);
  }
  return bytes;
}

/**
 * Encode any integer into Uint8Array
 * @param int Integer to encode
 * @returns {Uint8Array} Encoded integer
 */
export function intToUint8Array(int: number | bigint): Uint8Array {
  return toByteArray(int);
}

/**
 * Encode an integer into a Uint8Array (4 bytes)
 * @param int Integer to encode
 * @returns {Uint8Array} Encoded integer
 */
export function intToUint32Array(int: number): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0x0, int, true);
  return new Uint8Array(buffer).reverse();
}

export function intToUint64Array(int: number | bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0x0, getBigNumber(int), true);
  return new Uint8Array(buffer).reverse();
}

/**
 * Decode byte array (4 bytes) into a integer
 * @param {Uint8Array} bytes Bytes array to decode
 */
export function uint8ArrayToBigInt(bytes: Uint8Array): bigint {
  return fromByteArray(bytes);
}

/**
 * Convert a string into a big int for 10^8 decimals
 * @param {number} number Number to convert
 * @param {number} formatDecimals Number of decimals
 * @returns {number} Converted number
 */
export function parseBigInt(number: string, formatDecimals: number = 8): bigint {
  const match = number.match(/^([0-9]*)\.?([0-9]*)$/);
  if (!match || match[1].length + match[2].length == 0) {
    throw new Error("Invalid number");
  }

  let whole = match[1] || "0",
    decimal = match[2] || "";

  // Pad out the decimals
  while (decimal.length < formatDecimals) {
    decimal += "0000";
  }

  // Remove extra padding
  decimal = decimal.substring(0, formatDecimals);
  return BigInt(whole + decimal);
}

export function getBigNumber(number: bigint | number) {
  switch (typeof number) {
    case "bigint":
      return number;
    case "number":
      if (!Number.isInteger(number)) {
        throw new Error(`${number} is not an integer`);
      }
      return BigInt(number);
    default:
      throw new Error(`${number} is not an valid number`);
  }
}

/**
 * Convert a big int number of 10^8 decimals into a decimal number
 * @param number Number to convert
 * @param formatDecimals Number of decimals
 */
export function formatBigInt(number: bigint, formatDecimals: number = 8): string {
  let strNumber = getBigNumber(number).toString();
  // No decimal point for whole values
  if (formatDecimals === 0) {
    return strNumber;
  }

  // Pad out to the whole component (including a whole digit)
  while (strNumber.length <= formatDecimals) {
    strNumber = "0000" + strNumber;
  }

  // Insert the decimal point
  const index = strNumber.length - formatDecimals;
  strNumber = strNumber.substring(0, index) + "." + strNumber.substring(index);

  // Trim the whole component (leaving at least one 0)
  while (strNumber[0] === "0" && strNumber[1] !== ".") {
    strNumber = strNumber.substring(1);
  }

  // Trim the decimal component (leaving at least one 0)
  while (strNumber[strNumber.length - 1] === "0" && strNumber[strNumber.length - 2] !== ".") {
    strNumber = strNumber.substring(0, strNumber.length - 1);
  }

  return strNumber;
}

/**
 * Concatenate multiple Uint8Array into one
 * @param {Uint8Array[]} arrays
 */
export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
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

/**
 * Encode an Uint8Array into an hexadecimal string
 * @param {Uint8Array} bytes Uint8Array
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Encode an Uint8Array into a base64url string
 * @param arraybuffer
 */
export function base64url(arraybuffer: ArrayBuffer): string {
  let bytes = new Uint8Array(arraybuffer),
    i,
    len = bytes.length,
    base64 = "";

  for (i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1);
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2);
  }

  return base64;
}

/**
 * Convert any number into a byte uint8Array
 */
function toByteArray(number: number | bigint): Uint8Array {
  var hex = getBigNumber(number).toString(16);

  //Fix padding issue for invalid hex string
  if (hex.length % 2) {
    hex = "0" + hex;
  }

  // The byteLength will be half of the hex string length
  var len = hex.length / 2;
  var u8 = new Uint8Array(len);

  // And then we can iterate each element by one
  // and each hex segment by two
  var i = 0;
  var j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  return u8;
}

/**
 * Convert any byte array into a number
 *
 * @param bytes
 * @returns the number
 */
function fromByteArray(bytes: Uint8Array): bigint {
  let hex: string[] = [];

  bytes.forEach(function (i) {
    var h = i.toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });

  return BigInt("0x" + hex.join(""));
}

/**
 * Return the next Uint8 from an iterator of Uint8Array
 * There is an assumption on success
 * @param iter
 * @returns
 */
export function nextUint8(iter: IterableIterator<[number, number]>): number {
  return iter.next().value[1];
}

/**
 * String to Uint8Array
 * @param str
 * @returns
 */
export function serializeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Uint8Array to String
 * @param str
 * @returns
 */
export function deserializeString(encoded_str: Uint8Array): string {
  return new TextDecoder().decode(encoded_str);
}

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return CoreJSON.rawJSON(this.toString());
};
