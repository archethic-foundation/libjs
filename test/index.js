const { deriveAddress, deriveAddressCurvePrepended, deriveKeyPair } = require('../index')
const assert = require('assert')

describe ("deriveAddress", () => {
    it("should derive a address by using a seed and index", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0), "0096d8b2047ba29d617ba2d29076fb6995f33543e01f350e8828e75794bc7c0217")
    })
})
describe ("deriveAddressCurvePrepended", ()=>{
    it("should derive address with default curve i.e ed25519 prepended by using seed and index", () => {
        assert.strictEqual(deriveAddressCurvePrepended("mysuperseed",0), "00005154a2d9110f4230b60ee833ce8ec0dff7e88d4c8e66c2323a756649fcdcfa6d")
    })
    it("should derive address with Nist-P256 curve prepended by using seed and index", () => {
        assert.strictEqual(deriveAddressCurvePrepended("mysuperseed",0, "secp256k1", "sha256"), "02001d8de4a65d8df748160f95394751b0f8300a61efaa421468c0206505bbff6044")
    })
    it("should derive address with secp256k1 curve prepended by using seed and index", () => {
        assert.strictEqual(deriveAddressCurvePrepended("mysuperseed",0, "P256", "sha256"), "010096d8b2047ba29d617ba2d29076fb6995f33543e01f350e8828e75794bc7c0217")
    })
})
describe ("deriveKeyPair", () => {
    it("should derive a keypair by using a seed and index", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0).publicKey, "010004494a63b66df5442657affbc8c76b95ea1a19a756d1d9feb4b7a06f8373aff3f1666067d0c2082fe2dad8c77fa28010043608db7ab8a11479fb31056de3d1afbc")
    })
})
