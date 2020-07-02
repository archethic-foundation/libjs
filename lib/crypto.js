const { createHash, createHmac, createECDH, createCipheriv } = require('crypto')
const EdDSA = require('elliptic').eddsa
const EC = require('elliptic').ec

const _sodium = require('libsodium-wrappers');

const hash_algo_ids = {
    "sha256": 0x0,
    "sha512": 0x1,
    "sha3-256": 0x2,
    "sha3-512": 0x3, 
    "blake2b512": 0x4
}

const ec_eddsa = new EdDSA("ed25519")
const ec_P256 = new EC("p256")
const ec_secp256k1 = new EC("secp256k1")

module.exports = {
    hash: function(content, algo = "sha256") {
        const hash = createHash(algo);
        hash.update(content);

        return Buffer.concat([
            Buffer.alloc(1, hash_algo_ids[algo]),
            hash.digest()
        ])
    },

    derivateKeyPair(seed, index, curve = "ed25519") {
        pvBuf = derivatePrivateKey(seed, index)

        switch (curve) {
            case "ed25519": 
                curve_id_buf = Buffer.alloc(1, 0)
                key = ec_eddsa.keyFromSecret(pvBuf)
                pub_buf = Buffer.from(key.getPublic())
                return {
                    privateKey: Buffer.concat([curve_id_buf, pvBuf]),
                    publicKey: Buffer.concat([curve_id_buf, pub_buf])
                }
            case "P256":
                curve_id_buf = Buffer.alloc(1, 1)
                key = ec_P256.keyFromPrivate(pvBuf)
                pubBuf = Buffer.from(key.getPublic().encode('hex'), 'hex')
                return {
                    privateKey: Buffer.concat([curve_id_buf, pvBuf]),
                    publicKey: Buffer.concat([curve_id_buf, pubBuf])
                }
            case "secp256k1":
                curve_id_buf = Buffer.alloc(1, 2)
                key = ec_secp256k1.keyFromPrivate(pvBuf)
                pubBuf = Buffer.from(key.getPublic().encode('hex'), 'hex')
                return {
                    privateKey: Buffer.concat([curve_id_buf, pvBuf]),
                    publicKey: Buffer.concat([curve_id_buf, pubBuf])
                }
            default:
                throw "Curve not supported"
        }

    },

    sign(data, privateKey) {
        curve_buf = privateKey.slice(0, 1)
        pvBuf = privateKey.slice(1, privateKey.length)

        switch (curve_buf[0]) {
            case 0:
                hash = createHash("sha512");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_eddsa.keyFromSecret(pvBuf)
                return Buffer.from(key.sign(msgHash).toBytes())
            case 1:
                hash = createHash("sha256");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_P256.keyFromPrivate(pvBuf)
                return Buffer.from(key.sign(msgHash).toDER())
            case 2: 
                hash = createHash("sha256");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_secp256k1.keyFromPrivate(pvBuf)
                return Buffer.from(key.sign(msgHash).toDER())
            default:
                throw "Curve not supported"
        }
    },

    encrypt: function (data, publicKey) {
        curve_buf = publicKey.slice(0, 1)
        pubBuf = publicKey.slice(1, publicKey.length)

        switch (curve_buf[0]) {
            case 0:
                const curve25519pub = _sodium.crypto_sign_ed25519_pk_to_curve25519(pubBuf)
                return _sodium.crypto_box_seal(Buffer.from(data), curve25519pub)
            case 1: 
                ecdh = createECDH("prime256v1")
                ecdh.generateKeys();

                sharedKey = ecdh.computeSecret(pubBuf)
                var { aesKey, iv } = this.derivateSecret(sharedKey)

                cipher = createCipheriv("aes-256-gcm", aesKey, iv)
                encrypted = cipher.update(data)
                encrypted = Buffer.concat([ encrypted, cipher.final()])

                return Buffer.concat([
                    Buffer.from(ecdh.getPublicKey()),
                    cipher.getAuthTag(),
                    encrypted
                ])
            case 2: 
                ecdh = createECDH("secp256k1")
                ecdh.generateKeys();

                sharedKey = ecdh.computeSecret(pubBuf)
                var { aesKey, iv } = this.derivateSecret(sharedKey)

                cipher = createCipheriv("aes-256-gcm", aesKey, iv)
                encrypted = cipher.update(data)
                encrypted = Buffer.concat([ encrypted, cipher.final()])

                return Buffer.concat([
                    Buffer.from(ecdh.getPublicKey()),
                    cipher.getAuthTag(),
                    encrypted
                ])
        }
    },

    derivateSecret(sharedKey) {
        hmac = createHmac("sha256", "")
        hmac.update(sharedKey)
        pseudoRandomKey = hmac.digest()
    
        hmac = createHmac("sha256", pseudoRandomKey)
        hmac.update("0")
        iv = hmac.digest().slice(0, 32)
    
        hmac = createHmac("sha256", iv)
        hmac.update("1")
        aesKey = hmac.digest().slice(0, 32)
    
        return {
            iv,
            aesKey
        }
    }
}

function derivatePrivateKey(seed, index) {
    //Derivate master keys
    hmac = createHmac('sha512', "")
    hmac.update(seed)
    buf = hmac.digest()
    masterKey = buf.slice(0, 32)
    masterEntropy = buf.slice(32, 64)

    //Derivate the final seed
    hmac = createHmac('sha512', masterEntropy)
    index_buf = Buffer.alloc(1, index)
    extended_seed = Buffer.concat([masterKey, index_buf])
    hmac.update(extended_seed)
    hmac_buf = hmac.digest()

    // The first 32 bytes become the next private key
    return hmac_buf.slice(0, 32)
}