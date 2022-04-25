const Crypto = require("../lib/crypto")
const assert = require("assert")
const { randomBytes } = require('crypto')

const { uint8ArrayToHex}= require('../lib/utils')

describe("Crypto", () => {


  describe("hash", () => {

    it ("should generate a sha256 hash with an algo id at the begining", () => {
      assert.strictEqual(uint8ArrayToHex(Crypto.hash("myfakedata")), "004e89e81096eb09c74a29bdf66e41fc118b6d17ac547223ca6629a71724e69f23")
    })

    it ("should generate a sha512 hash with an algo id at the begining", () => {
      assert.strictEqual(uint8ArrayToHex(Crypto.hash("myfakedata", "sha512")), "01c09b378f954c39f8e3c2cc4ed9108937c6e6dbfa9f754a344bd395d2ba55aba9f071987a2c014f9c54d47931b243088aa2dd6c6d90ec92a67f8a9dfdd83eba58")
    })

    it ("should generate a sha3-256 hash with an algo id at the begining", () => {
      assert.strictEqual(uint8ArrayToHex(Crypto.hash("myfakedata", "sha3-256")), "029ddb36eabafb047ad869b9e4d35e2c5e6893b6bd2d1cdbdaec13425779f0f9da")
    })

    it ("should generate a sha3-512 hash with an algo id at the begining", () => {
      assert.strictEqual(uint8ArrayToHex(Crypto.hash("myfakedata", "sha3-512")), "03f64fe5d472619d235212f843c1ed8ae43598c3a5973eead66d70f88f147a0aaabcbcdc6aed160b0ae5cdf5d48871602827b242c479f999647c377698cb8b7d4f")
    })

    it ("should generate a blake2b hash with an algo id at the begining", () => {
      assert.strictEqual(uint8ArrayToHex(Crypto.hash("myfakedata", "blake2b")), "04f4101890104371a4d673ed717e824c80634edf3cb39e3eeff555049c0a025e5f13a6aa938c7501a98471cad9c13870c13e8691e97229e4a4b4e1930221c02ab8")
    })
  })

  describe("deriveKeyPair", () => {
    it ("should generate an EC keypair using Ed25519 curve", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "ed25519")
      assert.strictEqual(uint8ArrayToHex(keypair.publicKey), "000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c")
    })

    it ("should generate an EC keypair using P256 curve", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "P256")
      assert.strictEqual(uint8ArrayToHex(keypair.publicKey), "0101044d91a0a1a7cf06a2902d3842f82d2791bcbf3ee6f6dc8de0f90e53e9991c3cb33684b7b9e66f26e7c9f5302f73c69897be5f301de9a63521a08ac4ef34c18728")
    })

    it ("should generate an EC keypair using secp256k1 curve", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "secp256k1")
      assert.strictEqual(uint8ArrayToHex(keypair.publicKey), "0201044d02d071e7e24348fc24951bded20c08409b075c7956348fef89e118370f382cf99c064b17ad950aaeb1ae04971afdc6a44d68e731b8d0a01a8f56eade92875a")
    })

    it ("should produce different key by changing the index", () => {
      const keypair1 = Crypto.deriveKeyPair("seed", 0)
      const keypair2 = Crypto.deriveKeyPair("seed", 1)

      assert.notDeepStrictEqual(keypair1, keypair2)
    })
  })

  describe("sign/verify", () => {

    it ("should sign a message with an ed25519 key and create valid signature", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "ed25519")
      const sig = Crypto.sign("hello", keypair.privateKey)
      assert.strictEqual(Crypto.verify(sig, "hello", keypair.publicKey), true)
    })

    it ("should sign a message with an P256 key", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "P256")
      const  sig = Crypto.sign("hello", keypair.privateKey)
      assert.strictEqual(Crypto.verify(sig, "hello", keypair.publicKey), true)
    })

    it ("should sign a message with an secp256k1 key", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "secp256k1")
      const sig = Crypto.sign("hello", keypair.privateKey)
      assert.strictEqual(Crypto.verify(sig, "hello", keypair.publicKey), true)
    })

  })

  describe("ecEncrypt", () => {

    it("should encrypt a data using a ed25519 public key", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "ed25519")
      const ciphertext = Crypto.ecEncrypt("hello", keypair.publicKey)

      assert.deepStrictEqual(Crypto.ecDecrypt(ciphertext, keypair.privateKey), new TextEncoder().encode("hello"))
    })

    it("should encrypt a data using a P256 public key", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "P256")
      const ciphertext = Crypto.ecEncrypt("hello", keypair.publicKey)

      assert.deepStrictEqual(Crypto.ecDecrypt(ciphertext, keypair.privateKey), new TextEncoder().encode("hello"))
    })

    it("should encrypt a data using a secp256k1 public key", () => {
      const keypair = Crypto.deriveKeyPair("seed", 0, "secp256k1")
      const ciphertext = Crypto.ecEncrypt("hello", keypair.publicKey)

      assert.deepStrictEqual(Crypto.ecDecrypt(ciphertext, keypair.privateKey), new TextEncoder().encode("hello"))
    })
    
    it("should encrypt blob", () => {
      const blob = Uint8Array.from([1, 2, 3, 4, 5])
      
      const keypair = Crypto.deriveKeyPair("seed", 0, "secp256k1")
      const ciphertext = Crypto.ecEncrypt(blob, keypair.publicKey)
      assert.deepStrictEqual(Crypto.ecDecrypt(ciphertext, keypair.privateKey), blob)
    })
  })

  describe ("aesEncrypt", () => {
    it ("should encrypt and decrypt data with a key", () => {
      const key = randomBytes(32)
      const encrypted = Crypto.aesEncrypt("hello", key)
      assert.deepStrictEqual(Crypto.aesDecrypt(encrypted, key), new TextEncoder().encode("hello"))
    })
  })

}) 
