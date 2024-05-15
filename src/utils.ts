/**
 * Return the Initial Origin Private Key
 */
export const originPrivateKey = "01019280BDB84B8F8AEDBA205FE3552689964A5626EE2C60AA10E3BF22A91A036009";

/**
 * Convert CryptoJS.lib.WordArray to Uint8Array
 * @param wordArray
 * @returns {Uint8Array} Uint8Array
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
 * @returns {boolean} True if string is a valid hex string
 */
export function isHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Check if given variable is an object
 * @param variable
 * @returns {boolean} True if variable is an object
 */
export function isObject(variable: any): boolean {
  return typeof variable === "object" && !Array.isArray(variable) && variable !== null;
}

export function sortObjectKeysASC(term: any): any {
  // array: map over elements
  if (Array.isArray(term)) return term.map((item: any) => sortObjectKeysASC(item));

  if (term instanceof Map) {
    const sortedEntries = [...term.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return new Map(sortedEntries.map(([key, value]) => [key, sortObjectKeysASC(value)]));
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
 * @returns Uint8Array
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
 * Encode an integer into a Uint8Array (4 bytes)
 * @param int Integer to encode
 * @returns {Uint8Array} Encoded integer
 */
export function intToUint8Array(int: number): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0x0, int, true);
  return new Uint8Array(buffer).reverse();
}

/**
 * Encode a big integer into a Uint8Array (8 bytes)
 * @param {Number} number Number to encode
 * @returns {Uint8Array} Encoded big integer
 */
export function bigIntToUint8Array(number: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0x0, BigInt(number), true);
  return new Uint8Array(buffer).reverse();
}

/**
 * Decode byte array (4 bytes) into a integer
 * @param {Uint8Array} bytes Bytes array to decode
 * @returns {number} Decoded integer
 */
export function uint8ArrayToInt(bytes: Uint8Array): number {
  let value = 0;
  for (const element of bytes) {
    value = value * 256 + element;
  }
  return value;
}

/**
 * Convert any number into a big int for 10^8 decimals
 * @param number Number to convert
 * @param decimal Number of decimals
 * @returns {number} Big int number
 */
export function toBigInt(number: number, decimal: number = 8): number {
  // This is a workaroud of float weird behavior
  // 94.03999999999999 * 100_000_000 = 9404000000
  // 94.03999999999999 * 10*10*10*10*10*10*10*10 = 9403999999
  let nb = number;
  for (let i = 0; i < decimal; i++) {
    nb = nb * 10;
  }
  return Math.trunc(nb);
}

/**
 * Convert a big int number of 10^8 decimals into a decimal number
 * @param number Number to convert
 * @param decimal Number of decimals
 * @returns {number} Decimal number
 */
export function fromBigInt(number: number, decimal: number = 8): number {
  return number / Math.pow(10, decimal);
}

/**
 * Concatenate multiple Uint8Array into one
 * @param {Uint8Array[]} arrays
 * @returns {Uint8Array} Concatenated Uint8Array
 */
export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
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
 * @param {ArrayBuffer} arraybuffer Uint8Array
 * @returns {string} base64url string
 */
export function base64url(arraybuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arraybuffer);
  const len = bytes.length;
  let base64 = "";

  for (let i = 0; i < len; i += 3) {
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
 * Convert any number into a byte array
 * @param number Number to convert
 * @returns {Uint8Array} Byte array
 */
export function toByteArray(number: number): Uint8Array {
  if (number === 0) return Uint8Array.from([0]);

  const arr = [];
  while (number >= 256) {
    arr.push(number % 256);
    number = Math.floor(number / 256);
  }

  arr.push(number % 256);

  return new Uint8Array(arr).reverse();
}

/**
 * Alias of uint8ArrayToInt
 * @param bytes
 * @returns number
 */
export function fromByteArray(bytes: Uint8Array): number {
  return uint8ArrayToInt(bytes);
}

/**
 * Return the next Uint8 from an iterator of Uint8Array
 * There is an assumption on success
 * @param iter
 * @returns the next Uint8
 */
export function nextUint8(iter: IterableIterator<[number, number]>): number {
  return iter.next().value[1];
}

/**
 * String to Uint8Array
 * @param str
 * @returns Uint8Array
 */
export function serializeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Uint8Array to String
 * @param encoded_str
 * @returns string
 */
export function deserializeString(encoded_str: Uint8Array): string {
  return new TextDecoder().decode(encoded_str);
}
