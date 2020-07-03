/**
 * Determines if a string is an hexadecimal
 * @param {String} inputString Potential hexadecimal string
 */
module.exports.isHex = function(inputString) {
    var re = /[0-9A-Fa-f]{6}/g;
    return re.test(inputString)
}