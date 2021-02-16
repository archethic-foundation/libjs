const { deriveAddress, deriveKeyPair } = require('../index')
const assert = require('assert')

describe ("deriveAddress", () => {
    it("should derive a address by using a seed and index", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0), "00fee0f7458d98e76b649e7990eb5cefe8e658edd39b4a845c48292d68c63059b2")
    })
})

describe ("deriveKeyPair", () => {
    it("should derive a keypair by using a seed and index", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0).publicKey, "005b005cdd25478e6e39fa585617a8a1936eb17b606dad7dfa5c83950b5c2433d7")
    })
})
