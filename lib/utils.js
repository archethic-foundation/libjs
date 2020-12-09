/**
 * Determines if a string is an hexadecimal
 * @param {String} inputString Potential hexadecimal string
 */
module.exports.isHex = function(inputString) {
    var re = /[0-9A-Fa-f]{6}/g;
    return re.test(inputString)
}

/**
 * Encode an hexadecimal string into a Uint8Array
 * @param {Uint8Array} hexString Hexadecimal string
 */
module.exports.hexToUint8Array = function(hexString) {
  return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

/**
 * Encode an Uint8Array into an hexadecimal string
 * @param {Uint8Array} bytes Uint8Array
 */
module.exports.uint8ArrayToHex = function (bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

/**
 * Concat a list of Uint8Array
 * @param {Array} arrays Uint8Arrays
 */
module.exports.concatUint8Arrays = function (arrays) {
  // sum of individual array lengths
  let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);

  if (!arrays.length) return new Uint8Array()

   let result = new Uint8Array(totalLength);

      // for each array - copy it over result
      // next array is copied right after the previous one
      let length = 0;
      for(let array of arrays) {
            result.set(array, length);
            length += array.length;
      }

      return result;
}

/**
 * Encode a integer into a Uint8Array (4 bytes)
 * @param {Number} number Number to encode
 */
module.exports.encodeInt32 = function (number) {
  let array = new ArrayBuffer(4)
  let view = new DataView(array)
  view.setUint32(0, number, true)
  return new Uint8Array(array).reverse()
}

/**
 * Encode a big integer into a Uint8Array (8 bytes)
 * @param {Number} number Number to encode
 */
module.exports.encodeInt64 = function (number) {
  let array = new ArrayBuffer(8)
  let view = new DataView(array)
  view.setBigInt64(0, BigInt(number), true)
  return new Uint8Array(array).reverse()   
}

/**
 * Encode a float in into a Uint8Array (8 bytes)
 * @param {Number} number Number to encode
 */
module.exports.encodeFloat64 = function (number) {
  let array = new ArrayBuffer(8)
  let view = new DataView(array)
  view.setFloat64(0, number, true)
  return new Uint8Array(array).reverse()
}
