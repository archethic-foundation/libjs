const byteToHex = [];

for (let n = 0; n <= 0xff; ++n) {
  const hexOctet = n.toString(16).padStart(2, "0");
  byteToHex.push(hexOctet);
}

/**
 *
 * Return the Initial Origin Private Key
 */
export const originPrivateKey =
  "01019280BDB84B8F8AEDBA205FE3552689964A5626EE2C60AA10E3BF22A91A036009";

/**
 * Determines if a string is an hexadecimal
 * @param {String} inputString Potential hexadecimal string
 */
export function isHex(inputString) {
  const re = /^([0-9A-Fa-f])*$/;
  return re.test(inputString)
}

/**
 * Encode an hexadecimal string into a Uint8Array
 * @param {Uint8Array} hexString Hexadecimal string
 */
export function hexToUint8Array (hexString) {
  return new Uint8Array(
    hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );
};

/**
 * Encode an Uint8Array into an hexadecimal string
 * @param {Uint8Array} bytes Uint8Array
 */
export function uint8ArrayToHex (bytes) {
  const buff = new Uint8Array(bytes);
  const hexOctets = new Array(buff.length);

  for (let i = 0; i < buff.length; ++i) {
    hexOctets[i] = byteToHex[buff[i]];
  }

  return hexOctets.join("");
};

/**
 * Concat a list of Uint8Array
 * @param {Array} arrays Uint8Arrays
 */
export function concatUint8Arrays(arrays) {
  // sum of individual array lengths

  if (!arrays.length) return new Uint8Array();

  let totalLength = arrays.reduce((acc, value) => acc + value.byteLength, 0);

  const { buffer } = arrays.reduce(
    ({ buffer: buffer, pos: pos }, curr) => {
      buffer.set(new Uint8Array(curr), pos);
      return { buffer: buffer, pos: pos + curr.byteLength };
    },
    { buffer: new Uint8Array(totalLength), pos: 0 }
  );

  return buffer;
};

/**
 * Encode a integer into a Uint8Array (4 bytes)
 * @param {Number} number Number to encode
 */
export function encodeInt32 (number) {
  let array = new ArrayBuffer(4);
  let view = new DataView(array);
  view.setUint32(0, number, true);
  return new Uint8Array(array).reverse();
};

/**
 * Encode a big integer into a Uint8Array (8 bytes)
 * @param {Number} number Number to encode
 */
export function encodeInt64(number) {
  let array = new ArrayBuffer(8);
  let view = new DataView(array);
  view.setBigInt64(0, BigInt(number), true);
  return new Uint8Array(array).reverse();
};

/**
 * Decode byte array (4 bytes) into a integer
 * @param {Uint8Array} bytes Bytes array to decode
 */
export function decodeInt32(bytes) {
    let value = 0;
    for (let i = 0; i < bytes.length; i++) {
        value = (value * 256) + bytes[i];
    }
    return value;
}

/**
 * Convert any number into a big int for 10^8 decimals
 */
export function toBigInt(number, decimals = 8) {
  if (typeof number !== "number") throw "'number' must be an integer";
  if (typeof decimals !== "number") throw "'decimals' must be an integer";
  return Math.trunc(number * Math.pow(10, decimals))
};

/**
 * Convert a big int number of 10^8 decimals into a decimal
 */
export function fromBigInt(number, decimals = 8) {
  if (typeof number !== "number") throw "'number' must be an integer";
  if (typeof decimals !== "number") throw "'decimals' must be an integer";
  return number / (Math.pow(10, decimals));
};

/**
 * Convert any number into a byte array
 */
export function toByteArray(number) {
  if (!number) return [0];
  const a = [];
  a.unshift(number & 255);
  while (number >= 256) {
    number = number >>> 8;
    a.unshift(number & 255);
  }
  return a;
};
