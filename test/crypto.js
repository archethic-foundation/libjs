const Crypto = require("../lib/crypto")
const assert = require("assert")
const crypto = require("crypto")
const EdDSA = require('elliptic').eddsa
const EC = require('elliptic').ec
const _sodium = require('libsodium-wrappers');
const { createECDH, createDecipheriv } = require('crypto')

describe("Crypto", () => {

    describe("hash", () => {

        it ("should generate a sha256 hash with an algo id at the begining", () => {
            assert.equal(Crypto.hash("myfakedata").toString('hex'), "004e89e81096eb09c74a29bdf66e41fc118b6d17ac547223ca6629a71724e69f23")
        })

        it ("should generate a sha512 hash with an algo id at the begining", () => {
            assert.equal(Crypto.hash("myfakedata", "sha512").toString('hex'), "01c09b378f954c39f8e3c2cc4ed9108937c6e6dbfa9f754a344bd395d2ba55aba9f071987a2c014f9c54d47931b243088aa2dd6c6d90ec92a67f8a9dfdd83eba58")
        })

        it ("should generate a sha3-256 hash with an algo id at the begining", () => {
            assert.equal(Crypto.hash("myfakedata", "sha3-256").toString('hex'), "029ddb36eabafb047ad869b9e4d35e2c5e6893b6bd2d1cdbdaec13425779f0f9da")
        })

        it ("should generate a sha3-512 hash with an algo id at the begining", () => {
            assert.equal(Crypto.hash("myfakedata", "sha3-512").toString('hex'), "03f64fe5d472619d235212f843c1ed8ae43598c3a5973eead66d70f88f147a0aaabcbcdc6aed160b0ae5cdf5d48871602827b242c479f999647c377698cb8b7d4f")
        })

        it ("should generate a blake2b512 hash with an algo id at the begining", () => {
            assert.equal(Crypto.hash("myfakedata", "blake2b512").toString('hex'), "04f4101890104371a4d673ed717e824c80634edf3cb39e3eeff555049c0a025e5f13a6aa938c7501a98471cad9c13870c13e8691e97229e4a4b4e1930221c02ab8")
        })
    })

    describe("derivateKeyPair", () => {
        it ("should generate an EC keypair using Ed25519 curve", () => {
            keypair = Crypto.derivateKeyPair("seed", 0)
            assert.equal(keypair.publicKey.toString('hex'), "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        })

        it ("should generate an EC keypair using P256 curve", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "P256")
            assert.equal(keypair.publicKey.toString('hex'), "01049a3bc11b43b69232b442be17a1b19954a7528e0360c44a4c119e140ec5c7a7f21e7c55a7dccf0c75491aca484dbeffa5457e1dc26a4024f7f0fe6d30b78423d8")
        })

        it ("should generate an EC keypair using secp256k1 curve", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "secp256k1")
            assert.equal(keypair.publicKey.toString('hex'), "0204a976171117da94fe6537754eac950692098fb6b878740b1fe33dccb5433fde2a968925da65cbdb83ce232524bba90e328f0e87f1a269a5af10003418e34f85e6")
        })

        it ("should produce different key by changing the index", () => {
            keypair1 = Crypto.derivateKeyPair("seed", 0)
            keypair2 = Crypto.derivateKeyPair("seed", 1)

            assert.notDeepEqual(keypair1, keypair2)
        })
    })

    describe("sign", () => {

        it ("should sign a message with an ed25519 key", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "ed25519")
            sig = Crypto.sign("hello", keypair.privateKey)

            ec = new EdDSA("ed25519")

            key = ec.keyFromPublic(keypair.publicKey.slice(1, keypair.publicKey.length).toString('hex'), 'hex')
            const hash = crypto.createHash("sha512");
            hash.update("hello");
            msgHash = hash.digest()

            assert.equal(key.verify(msgHash, sig.toString('hex')), true)
       })

        it ("should sign a message with an P256 key", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "P256")
            sig = Crypto.sign("hello", keypair.privateKey)

            ec = new EC("p256")

            key = ec.keyFromPublic(keypair.publicKey.slice(1, keypair.publicKey.length))
            const hash = crypto.createHash("sha256");
            hash.update("hello");
            msgHash = hash.digest()

            assert.equal(key.verify(msgHash, sig), true)
        })

        it ("should sign a message with an secp256k1 key", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "secp256k1")
            sig = Crypto.sign("hello", keypair.privateKey)

            ec = new EC("secp256k1")

            key = ec.keyFromPublic(keypair.publicKey.slice(1, keypair.publicKey.length))
            const hash = crypto.createHash("sha256");
            hash.update("hello");
            msgHash = hash.digest()

            assert.equal(key.verify(msgHash, sig), true)
        })

    })

    describe("encrypt", () => {

        it("should encrypt a data using a ed25519 public key", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "ed25519")
            ciphertext = Crypto.encrypt(Buffer.from("hello"), keypair.publicKey)

            pvBuf = keypair.privateKey.slice(1, 33)
            pubBuf = keypair.publicKey.slice(1, 33)

            curve25519_pub = _sodium.crypto_sign_ed25519_pk_to_curve25519(pubBuf)
            curve25519_pv = _sodium.crypto_sign_ed25519_sk_to_curve25519(Buffer.concat([pvBuf, pubBuf]))
            assert.deepEqual(_sodium.crypto_box_seal_open(ciphertext, curve25519_pub, curve25519_pv), Buffer.from("hello"))
        })

        it("should encrypt a data using a P256 public key", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "P256")
            ciphertext = Crypto.encrypt(Buffer.from("hello"), keypair.publicKey)

            ephemeralPubKey = ciphertext.slice(0, 65)
            tag = ciphertext.slice(65, 65+16)
            encrypted = ciphertext.slice(65+16, ciphertext.length)

            ecdh = createECDH("prime256v1")
            ecdh.setPrivateKey(keypair.privateKey.slice(1, 33))
            sharedKey = ecdh.computeSecret(ephemeralPubKey)

            const { aesKey, iv } = Crypto.derivateSecret(sharedKey)

            cipher = createDecipheriv("aes-256-gcm", aesKey, iv)
            cipher.setAuthTag(tag)
            decrypted = cipher.update(encrypted)
            
            decrypted += cipher.final()

            assert.equal(decrypted, "hello")
        })

        it("should encrypt a data using a secp256k1 public key", () => {
            keypair = Crypto.derivateKeyPair("seed", 0, "secp256k1")
            ciphertext = Crypto.encrypt(Buffer.from("hello"), keypair.publicKey)

            ephemeralPubKey = ciphertext.slice(0, 65)
            tag = ciphertext.slice(65, 65+16)
            encrypted = ciphertext.slice(65+16, ciphertext.length)

            ecdh = createECDH("secp256k1")
            ecdh.setPrivateKey(keypair.privateKey.slice(1, 33))
            sharedKey = ecdh.computeSecret(ephemeralPubKey)

            const { aesKey, iv } = Crypto.derivateSecret(sharedKey)

            cipher = createDecipheriv("aes-256-gcm", aesKey, iv)
            cipher.setAuthTag(tag)
            decrypted = cipher.update(encrypted)
            
            decrypted += cipher.final()

            assert.equal(decrypted, "hello")
        })
    })
})
