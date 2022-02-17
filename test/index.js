const { deriveAddress, deriveKeyPair } = require('../index')
const assert = require('assert')

describe ("deriveAddress", () => {
    it("should derive a address by using a seed and index with default", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0), "00005154a2d9110f4230b60ee833ce8ec0dff7e88d4c8e66c2323a756649fcdcfa6d")
    })
    it("should derive a address by using a seed and index with Nist P256 curve and SHA256 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'P256'), "010096d8b2047ba29d617ba2d29076fb6995f33543e01f350e8828e75794bc7c0217")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA256 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1'), "02001d8de4a65d8df748160f95394751b0f8300a61efaa421468c0206505bbff6044")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA512 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'sha512'), "02012c80ef0e2e402621a9774b66b7cec375c319782fb5cfccb5ea353153a70aef90ec86913ebb32ce317b59d8508e586c4fe916de2ef780656682291c50245549e5")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA3-256 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'sha3-256'), "0202ab500020a76d7c68584e060da6c41cc4cf201b018f633dc13de41c977cc84fca")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA3-512 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'sha3-512'), "02036b2dc69e917d12fd34b5d27895ac00adb16db79f8d1e732d401c81540a8bfd8d42cb761e77febaf334d9f48d9baf57cc10079b0cc12e0c7214781da54739e7f3")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and Blake2b hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'blake2b'), "0204c15efae790e007f07125c15ae9955dd9a07216e1ea8f1390fdd563c20a30c6c27d02a1ec0848570b330440635c6b28b481f4cb8184c74a28db92f5418b9169a5")
    })
})
describe ("deriveKeyPair", () => {
    it("should derive a keypair by using a seed and index using default curve i.e ed25519", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0).publicKey, "0000c184571c9329a3affd6b5cf7c4eb1bcf56774475d554468382c37d932c7a03f1")
    })
    it("should derive a keypair by using a seed and index using Nist P256 curve", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0, 'P256').publicKey, "010004494a63b66df5442657affbc8c76b95ea1a19a756d1d9feb4b7a06f8373aff3f1666067d0c2082fe2dad8c77fa28010043608db7ab8a11479fb31056de3d1afbc")
    })
    it("should derive a keypair by using a seed and index using ", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0, 'secp256k1').publicKey, "02000478d2cc0c37955b3765e9c9553e8dbcd71925253fdc9d63389acc417438838720d709de3e514b1f0bd50353545e834b2fe03d764958a65045f5f4d33416ddde04")
    })
})
