const Crypto = require("../lib/crypto")
const assert = require("assert")
const _sodium = require('libsodium-wrappers');
const { createECDH, createDecipheriv, randomBytes } = require('crypto')

const { uint8ArrayToHex, concatUint8Arrays} = require('../lib/utils')

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
            const keypair = Crypto.deriveKeyPair("seed", 0)
            assert.strictEqual(uint8ArrayToHex(keypair.publicKey), "00462664092eea75241c889db84ab9732068d37c3d521e4890fecabe9c614a81fa")
        })

        it ("should generate an EC keypair using P256 curve", () => {
            const keypair = Crypto.deriveKeyPair("seed", 0, "P256")
            assert.strictEqual(uint8ArrayToHex(keypair.publicKey), "010488f546d68919bf9caf0eb172586a42824c67c07bc29d31cba27839a21f194cee88b59bd36a55870ec0b26a2cd39c84ec2efbce7329e573c5fd7109260f0d84e8")
        })

        it ("should generate an EC keypair using secp256k1 curve", () => {
            const keypair = Crypto.deriveKeyPair("seed", 0, "secp256k1")
            assert.strictEqual(uint8ArrayToHex(keypair.publicKey), "0204350d90092eeaaba2607ee2d307ce4e2130b5d9d567e20764b742c7133b0e1ad9af1d1e5d4a2e831bde9cbecd14864f5dd3e08bdf6621f36600ff3beeb0fdda8d")
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

            const secret = Uint8Array.from([
                10, 35, 17, 69, 75, 209, 215, 254, 93, 80, 136, 162, 3, 11, 92, 115, 73, 248,
                11, 116, 237, 131, 153, 68, 241, 39, 161, 97, 1, 185, 253, 200
            ]);

            const ciphertext = Crypto.ecEncrypt(secret, keypair.publicKey)
            assert.strictEqual(ciphertext.length, 80)

            const pvBuf = keypair.privateKey.slice(1, 33)
            const pubBuf = keypair.publicKey.slice(1, 33)

            const curve25519_pub = _sodium.crypto_sign_ed25519_pk_to_curve25519(pubBuf)
            const curve25519_pv = _sodium.crypto_sign_ed25519_sk_to_curve25519(concatUint8Arrays([pvBuf, pubBuf]))
            assert.deepStrictEqual(_sodium.crypto_box_seal_open(ciphertext, curve25519_pub, curve25519_pv), secret)
        })

        it("should encrypt a data using a P256 public key", () => {
            const keypair = Crypto.deriveKeyPair("seed", 0, "P256")
            const ciphertext = Crypto.ecEncrypt("hello", keypair.publicKey)

            const ephemeralPubKey = ciphertext.slice(0, 65)
            const tag = ciphertext.slice(65, 65+16)
            const encrypted = ciphertext.slice(65+16, ciphertext.length)

            let ecdh = createECDH("prime256v1")
            ecdh.setPrivateKey(keypair.privateKey.slice(1, 33))
            const sharedKey = ecdh.computeSecret(ephemeralPubKey)

            const { aesKey, iv } = Crypto.deriveSecret(sharedKey)

            let cipher = createDecipheriv("aes-256-gcm", aesKey, iv)
            cipher.setAuthTag(tag)
            let decrypted = cipher.update(encrypted)
            
            decrypted += cipher.final()

            assert.strictEqual(decrypted, "hello")
        })

        it("should encrypt a data using a secp256k1 public key", () => {
            const keypair = Crypto.deriveKeyPair("seed", 0, "secp256k1")
            const ciphertext = Crypto.ecEncrypt("hello", keypair.publicKey)

            const ephemeralPubKey = ciphertext.slice(0, 65)
            const tag = ciphertext.slice(65, 65+16)
            const encrypted = ciphertext.slice(65+16, ciphertext.length)

            let ecdh = createECDH("secp256k1")
            ecdh.setPrivateKey(keypair.privateKey.slice(1, 33))
            const sharedKey = ecdh.computeSecret(ephemeralPubKey)

            const { aesKey, iv } = Crypto.deriveSecret(sharedKey)

            let cipher = createDecipheriv("aes-256-gcm", aesKey, iv)
            cipher.setAuthTag(tag)
            let decrypted = cipher.update(encrypted)
            
            decrypted += cipher.final()

            assert.strictEqual(decrypted, "hello")
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
