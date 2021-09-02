const byteToHex = [];

for (let n = 0; n <= 0xff; ++n)
{
	const hexOctet = n.toString(16).padStart(2, "0");
	byteToHex.push(hexOctet);
}


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
	const buff = new Uint8Array(bytes)
	const hexOctets = new Array(buff.length)

	for (let i = 0; i < buff.length; ++i) {
		hexOctets[i] = byteToHex[buff[i]]
	}

	return hexOctets.join("")
}

/**
 * Concat a list of Uint8Array
 * @param {Array} arrays Uint8Arrays
 */
module.exports.concatUint8Arrays = function (arrays) {
	// sum of individual array lengths

	if (!arrays.length) return new Uint8Array()

	let totalLength = arrays.reduce((acc, value) => acc + value.byteLength, 0);

	const { buffer } =  arrays.reduce(({ buffer: buffer, pos: pos}, curr) => {
		buffer.set(new Uint8Array(curr), pos)
		return { buffer: buffer, pos: pos + curr.byteLength }
	}, { buffer: new Uint8Array(totalLength), pos: 0})

	return buffer
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
