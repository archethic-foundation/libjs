const { deriveAddress, deriveKeyPair, newKeychainTransaction, newAccessKeychainTransaction, aesDecrypt, ecDecrypt} = require('../index')
const assert = require('assert')
const { hexToUint8Array, uint8ArrayToHex } = require('../lib/utils')
const {newKeychain} = require("../lib/keychain")
        

describe ("deriveAddress", () => {
    it("should derive a address by using a seed and index with default", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0), "0000b0c17f85ca19e3db670992e79adb94fb560bd750fda06d45bc0a42912c89d31e")
    })
    it("should derive a address by using a seed and index with Nist P256 curve and SHA256 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'P256'), "01001b35aff40ceaa9e77cb4411cf229b9bab90fab7ad23c955b52bc6dc0c8f7198c")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA256 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1'), "02007b17c3962a41519c7745d6c16bcbc7f869df0458b563d500467319d6712b8659")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA512 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'sha512'), "020181d1b48dc728b15284db73f316bfd2be12a122d287c5334708dc8785340dc240b86b2bd9b0f642a4e01541107950ad996ff472b4f122f14f59646c2034da9ed9")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA3-256 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'sha3-256'), "02022b6066277eda08508d51a447158659825630e479f8f9438d9a6fee60ed673276")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and SHA3-512 hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'sha3-512'), "020393fcff75b372d3a3f787add485285449d68193d02d4f5bb02459a3c6671d7d2a2bd21a06c10a58d7d8e0ee03a1cddbaea86224890e3b99935f2019ca99612634")
    })
    it("should derive a address by using a seed and index with secp256k1 curve and Blake2b hash algo", () => {
        assert.strictEqual(deriveAddress("mysuperseed", 0, 'secp256k1', 'blake2b'), "0204ca0f111a48aae4a1920f9f23c5ac6c80e8531efafac8e6cd2ab3f0846c3d2a2d153c79dfe8c690c223d7d9aec7fd341009bbcad4b63c75bd6e20b0a7e4deacf4")
    })
})
describe ("deriveKeyPair", () => {
    it("should derive a keypair by using a seed and index using default curve i.e ed25519", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0).publicKey, "0001c184571c9329a3affd6b5cf7c4eb1bcf56774475d554468382c37d932c7a03f1")
    })
    it("should derive a keypair by using a seed and index using Nist P256 curve", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0, 'P256').publicKey, "010104494a63b66df5442657affbc8c76b95ea1a19a756d1d9feb4b7a06f8373aff3f1666067d0c2082fe2dad8c77fa28010043608db7ab8a11479fb31056de3d1afbc")
    })
    it("should derive a keypair by using a seed and index using ", () => {
        assert.strictEqual(deriveKeyPair("mysuperseed", 0, 'secp256k1').publicKey, "02010478d2cc0c37955b3765e9c9553e8dbcd71925253fdc9d63389acc417438838720d709de3e514b1f0bd50353545e834b2fe03d764958a65045f5f4d33416ddde04")
    })
})

describe ("newKeychainTransaction", () => {
    it("should create a new keychain transaction", () => {
        const { privateKey: originPrivateKey} = deriveKeyPair("origin_seed", 0)
        const authorizedPublicKey = hexToUint8Array("000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c")        
        const tx = newKeychainTransaction("seed", [authorizedPublicKey], originPrivateKey)
        
        const keychain = newKeychain("seed")
        
        const tx_content = new TextEncoder().encode(JSON.stringify(keychain.toDID()))
        
        assert.equal("keychain", tx.type)
        assert.deepStrictEqual(tx.data.content, tx_content)
    })        
})

describe("newAccessKeychainTransaction", () => {
    it("should create a new access keychain transaction and encrypt the keychain address in the secret", () => {
        const { privateKey: originPrivateKey} = deriveKeyPair("origin_seed", 0)
        
        const seed = "mysuperseed"
        const keychainAddress = "0000b0c17f85ca19e3db670992e79adb94fb560bd750fda06d45bc0a42912c89d31e"
        const { privateKey } = deriveKeyPair(seed, 0)
        
        const tx = newAccessKeychainTransaction(seed, keychainAddress, originPrivateKey)
        
        const aesKey = ecDecrypt(tx.data.ownerships[0].authorizedKeys[0].encryptedSecretKey, privateKey)
        
        const decryptedAddress = aesDecrypt(tx.data.ownerships[0].secret, aesKey)

                
        assert.equal("keychain_access", tx.type)
        assert.deepStrictEqual(keychainAddress, uint8ArrayToHex(decryptedAddress))
    })        
})
