const { createHash, createHmac, createECDH, createCipheriv, randomBytes, createDecipheriv } = require('crypto')
const EdDSA = require('elliptic').eddsa
const EC = require('elliptic').ec
const { sha3_512, sha3_256} = require('js-sha3');
const blake2b = require('blake2b');
const curve25519 = require('curve25519-js')
const ed2curve = require('ed2curve')

const { isHex, hexToUint8Array, concatUint8Arrays, encodeInt32 } = require('./utils');

const ec_eddsa = new EdDSA("ed25519")
const ec_P256 = new EC("p256")
const ec_secp256k1 = new EC("secp256k1")

module.exports = {

    /**
     * Create a hash digest from the data with an hash algorithm identification prepending the digest
     * @param {String |Uint8Array} content Data to hash (string or buffer)
     * @param {String} algo Hash algorithm ("sha256", "sha512", "sha3-256", "sha3-512", "blake2b")
     */
    hash: function(content, algo = "sha256") {

        if (typeof(content) !== "string" && !(content instanceof Uint8Array)) {
            throw "'content' must be a string or Uint8Array"
        }

        if (typeof(content) == "string") {
            if(isHex(content)) {
                content = hexToUint8Array(content)
            } else {
                content = new TextEncoder().encode(content)
            }
        }

        switch(algo) {
            case "sha256":
                var hash = createHash(algo);
                hash.update(content);
                return concatUint8Arrays([
                    Uint8Array.from([0]),
                    hash.digest()
                ])
            case "sha512":
                var hash = createHash(algo);
                hash.update(content);
                return concatUint8Arrays([
                    Uint8Array.from([1]),
                    hash.digest()
                ])
            case "sha3-256":
                var hash = sha3_256.create();
                hash.update(content)
                return concatUint8Arrays([
                    Uint8Array.from([2]),
                    new Uint8Array(hash.digest())
                ])
            case "sha3-512":
                var hash = sha3_512.create()
                hash.update(content)
                return concatUint8Arrays([
                    Uint8Array.from([3]),
                    new Uint8Array(hash.digest())
                ])
            case "blake2b":
                var output = new Uint8Array(64)
                var hash = blake2b(64)
                hash.update(content)
                hash.digest(output)
                return concatUint8Arrays([
                    Uint8Array.from([4]),
                    Uint8Array.from(output)
                ])
            default:
                throw "Hash algorithm not supported"
        }
    },

    /**
     * Generate a keypair using a derivation function with a seed and an index. Each keys is prepending with a curve identification.
     * @param {String} seed Keypair derivation seed
     * @param {Integer} index Number to identify the order of keys to generate
     * @param {String} curve Elliptic curve to use ("ed25519", "P256", "secp256k1")
     */
    deriveKeyPair(seed, index, curve = "P256") {
        
        if (typeof(seed) !== "string" && !(seed instanceof Uint8Array)) {
            throw "'seed must be a string"
        }

        if (typeof index !== 'number' || index < 0) {
            throw "'index' must be a positive number"
        }

        pvBuf = derivePrivateKey(seed, index)
        const software_id_buf = Uint8Array.from([0])

        switch (curve) {
            case "ed25519": 
                curve_id_buf = Uint8Array.from([0])
                key = ec_eddsa.keyFromSecret(pvBuf)
                pubBuf = new Uint8Array(key.pubBytes())
  
            return {
                    privateKey: concatUint8Arrays([curve_id_buf, software_id_buf, pvBuf]),
                    publicKey: concatUint8Arrays([curve_id_buf, software_id_buf, pubBuf])
                }
            case "P256":
                curve_id_buf = Uint8Array.from([1])
                key = ec_P256.keyFromPrivate(pvBuf)
                pubBuf = hexToUint8Array(key.getPublic().encode("hex"))
                return {
                    privateKey: concatUint8Arrays([curve_id_buf, software_id_buf, pvBuf]),
                    publicKey: concatUint8Arrays([curve_id_buf, software_id_buf, pubBuf])
                }
            case "secp256k1":
                curve_id_buf = Uint8Array.from([2])
                key = ec_secp256k1.keyFromPrivate(pvBuf)
                pubBuf = hexToUint8Array(key.getPublic().encode("hex"))
                return {
                    privateKey: concatUint8Arrays([curve_id_buf, software_id_buf, pvBuf]),
                    publicKey: concatUint8Arrays([curve_id_buf, software_id_buf, pubBuf])
                }
            default:
                throw "Curve not supported"
        }

    },

    /**
     * Sign the data 
     * @param {String | Uint8Array} data Data to sign
     * @param {String | Uint8Array} privateKey Private key to use to sign the data
     */
    sign(data, privateKey) {

        if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
            throw "'data' must be a string or Uint8Array"
        }

        if (typeof(privateKey) !== "string" && !(privateKey instanceof Uint8Array)) {
            throw "'privateKey' must be a string or an Uint8Array"
        }

        if (typeof(data) == "string") {
            if(isHex(data)) {
                data = hexToUint8Array(data)
            } else {
                data = new TextEncoder().encode(data)
            }
        }

        if (typeof(privateKey) == "string") {
            if(isHex(privateKey)) {
                privateKey = hexToUint8Array(privateKey)
            } else {
                throw "'privateKey' must be an hexadecimal string"
            }
        }

        curveBuf = privateKey.slice(0, 1)
        pvBuf = privateKey.slice(2, privateKey.length)

        switch (curveBuf[0]) {
           case 0:
               key = ec_eddsa.keyFromSecret(pvBuf)
               return Uint8Array.from(key.sign(data).toBytes())
            case 1:
                hash = createHash("sha256");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_P256.keyFromPrivate(pvBuf)
                return Uint8Array.from(key.sign(msgHash).toDER())
            case 2: 
                hash = createHash("sha256");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_secp256k1.keyFromPrivate(pvBuf)
                return Uint8Array.from(key.sign(msgHash).toDER())
            default:
                throw "Curve not supported"
        }
    },

    verify: function(sig, data, publicKey) {
        if (typeof(sig) !== "string" && !(sig instanceof Uint8Array)) {
            throw "'signature' must be a string of Uint8Array"
        }
        
        if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
            throw "'data' must be a string or Uint8Array"
        }

        if (typeof(publicKey) !== "string" && !(publicKey instanceof Uint8Array)) {
            throw "'publicKey' must be a string or Uint8Array"
        }

        if (typeof(sig) == "string") {
           if (isHex(sig)) {
              sig = hexToUint8Array(sig)
           } else {
             throw "'signature' must be an hexadecimal string"
           }
        }

        if (typeof(data) == "string") {
            if(isHex(data)) {
                data = hexToUint8Array(data)
            } else {
                data = new TextEncoder().encode(data)
            }
        }

        if (typeof(publicKey) == "string") {
            if(isHex(publicKey)) {
                publicKey = hexToUint8Array(publicKey)
            } else {
               throw "'publicKey' must be an hexadecimal string"
            }
        }

        curveBuf = publicKey.slice(0, 1)
        pubBuf = publicKey.slice(2, publicKey.length)
        switch (curveBuf[0]) {
            case 0:
                key = ec_eddsa.keyFromPublic(Array.from(pubBuf))
                return key.verify(data, Array.from(sig))
            case 1:
                hash = createHash("sha256");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_P256.keyFromPublic(pubBuf)
                return key.verify(msgHash, sig)
            case 2: 
                hash = createHash("sha256");
                hash.update(data);
                msgHash = hash.digest()

                key = ec_secp256k1.keyFromPublic(pubBuf)
                return key.verify(msgHash, sig)
            default:
                throw "Curve not supported"
        }
   },

    /**
     * Encrypt a data for a given public key using ECIES algorithm
     * @param {String | Uint8Array} data Data to encrypt
     * @param {String | Uint8Array} publicKey Public key for the shared secret encryption
     */
    ecEncrypt: function (data, publicKey) {

        if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
            throw "'data' must be a string or Uint8Array"
        }

        if (typeof(publicKey) !== "string" && !(publicKey instanceof Uint8Array)) {
            throw "'publicKey' must be a string or Uint8Array"
        }

        if (typeof(data) == "string") {
            if(isHex(data)) {
                data = hexToUint8Array(data)
            } else {
                data = new TextEncoder().encode(data)
            }
        }

        if (typeof(publicKey) == "string") {
            if(isHex(publicKey)) {
                publicKey = hexToUint8Array(publicKey)
            } else {
                throw "'publicKey' must be an hexadecimal string"
            }
        }

        curve_buf = publicKey.slice(0, 1)
        pubBuf = publicKey.slice(2, publicKey.length)


        switch (curve_buf[0]) {
           case 0: {
            const { public: ephemeralPublicKey, private: ephemeralPrivateKey} = curve25519.generateKeyPair(randomBytes(32))  
            const curve25519pub = ed2curve.convertPublicKey(pubBuf)

            var sharedKey = curve25519.sharedKey(ephemeralPrivateKey, curve25519pub)
            var { aesKey, iv } = deriveSecret(sharedKey)
            
            var { tag, encrypted } = aesAuthEncrypt(data, aesKey, iv)
           
           return concatUint8Arrays([
              Uint8Array.from(ephemeralPublicKey),
              tag,
              encrypted
            ])
           }

          case 1: {
            ecdh = createECDH("prime256v1")
            ecdh.generateKeys(); 
            sharedKey = ecdh.computeSecret(pubBuf)
            
            var { aesKey, iv } = deriveSecret(sharedKey)
            var { tag, encrypted} = aesAuthEncrypt(data, aesKey, iv)

            return concatUint8Arrays([
              Uint8Array.from(ecdh.getPublicKey()),
              tag,
              encrypted
            ])
          }
          case 2: {
            ecdh = createECDH("secp256k1")
            ecdh.generateKeys(); 
            sharedKey = ecdh.computeSecret(pubBuf)

            var { aesKey, iv } = deriveSecret(sharedKey)

            var { tag, encrypted} = aesAuthEncrypt(data, aesKey, iv)

            return concatUint8Arrays([
              Uint8Array.from(ecdh.getPublicKey()),
              tag,
              encrypted
            ])
          }
          default: {
            throw "Curve not supported"
          }
        }
    },
    
    /**
     * Decrypt a ciphertext for a given private key using ECIES algorithm
     * @param {String | Uint8Array} ciphertext Ciphertext to decrypt
     * @param {String | Uint8Array} privateKey Private key for the shared secret encryption
     */
    ecDecrypt: function (ciphertext, privateKey) {
        
        if (typeof(ciphertext) !== "string" && !(ciphertext instanceof Uint8Array)) {
            throw "'ciphertext' must be a string or Uint8Array"
        }

        if (typeof(privateKey) !== "string" && !(privateKey instanceof Uint8Array)) {
            throw "'privateKey' must be a string or Uint8Array"
        }

        if (typeof(ciphertext) == "string") {
            if(isHex(ciphertext)) {
                ciphertext = hexToUint8Array(ciphertext)
            } else {
              throw "'ciphertext' must be an hexadecimal string"
            }
        }

        if (typeof(privateKey) == "string") {
            if(isHex(privateKey)) {
                privateKey = hexToUint8Array(privateKey)
            } else {
                throw "'privateKey' must be an hexadecimal string"
            }
        }

      curve_buf = privateKey.slice(0, 1)
      pvBuf = privateKey.slice(2, privateKey.length)
    
      switch (curve_buf[0]) {
        case 0: {
            ephemeralPubKey = ciphertext.slice(0, 32)
            tag = ciphertext.slice(32, 32+16)
            encrypted = ciphertext.slice(32+16, ciphertext.length)
  
            const curve25519pv = ed2curve.convertSecretKey(pvBuf)
  
            var sharedKey = curve25519.sharedKey(curve25519pv, ephemeralPubKey)
            var { aesKey, iv } = deriveSecret(sharedKey)
            
            return aesAuthDecrypt(encrypted, aesKey, iv, tag)  
        }
        case 1: {
            ephemeralPubKey = ciphertext.slice(0, 65)
            tag = ciphertext.slice(65, 65+16)
            encrypted = ciphertext.slice(65+16, ciphertext.length)
            
            ecdh = createECDH("prime256v1")
            ecdh.setPrivateKey(pvBuf)
            sharedKey = ecdh.computeSecret(ephemeralPubKey)
            var { aesKey, iv } = deriveSecret(sharedKey)
  
            return aesAuthDecrypt(encrypted, aesKey, iv, tag)
        }
        case 2: {
            ephemeralPubKey = ciphertext.slice(0, 65)
            tag = ciphertext.slice(65, 65+16)
            encrypted = ciphertext.slice(65+16, ciphertext.length)
  
            ecdh = createECDH("secp256k1")
            ecdh.setPrivateKey(pvBuf)
            sharedKey = ecdh.computeSecret(ephemeralPubKey)
            var { aesKey, iv } = deriveSecret(sharedKey)
  
            return aesAuthDecrypt(encrypted, aesKey, iv, tag)
        }
        default: {
            throw "Curve not supported"
        }
      }
    },

    /**
     * Encrypt a data for a given public key using AES algorithm
     * @param {String | Uint8Array} data Data to encrypt
     * @param {String | Uint8Array} key Symmetric key
     */
    aesEncrypt: function (data, key) {
        if (typeof(data) !== "string" && !(data instanceof Uint8Array)) {
            throw "'data' must be a string or Uint8Array"
        }

        if (typeof(key) !== "string" && !(key instanceof Uint8Array)) {
            throw "'key' must be a string or Uint8Array"
        }

        if (typeof(data) == "string") {
            if(isHex(data)) {
                data = hexToUint8Array(data)
            } else {
                data = new TextEncoder().encode(data)
            }
        }

        if (typeof(key) == "string") {
            if(isHex(key)) {
                key = hexToUint8Array(key)
            } else {
                throw "'key' must be an hexadecimal string"
            }
        }

        const iv = randomBytes(12)
        const cipher = createCipheriv('aes-256-gcm', key, iv)
        let cryptedBuffers = [cipher.update(data)]
        cryptedBuffers.push(cipher.final())

        const ciphertext = concatUint8Arrays([
            new Uint8Array(iv),
            new Uint8Array(cipher.getAuthTag()),
            concatUint8Arrays(cryptedBuffers)
        ])

        return ciphertext
    },

    aesDecrypt: function (cipherText, key) {

        if (typeof(cipherText) !== "string" && !(cipherText instanceof Uint8Array)) {
            throw "'cipherText' must be a string or Uint8Array"
        }

        if (typeof(key) !== "string" && !(key instanceof Uint8Array)) {
            throw "'key' must be a string or Uint8Array"
        }

        if (typeof(cipherText) == "string") {
            if(isHex(cipherText)) {
                cipherText = hexToUint8Array(cipherText)
            } else {
                throw "'cipherText' must be an hexadecimal string"
            }
        }

        if (typeof(key) == "string") {
            if(isHex(key)) {
                key = hexToUint8Array(key)
            } else {
                throw "'key' must be an hexadecimal string"
            }
        }

        const iv = cipherText.slice(0, 12)
        const tag = cipherText.slice(12, 12 + 16)
        const encrypted = cipherText.slice(28, cipherText.length)

        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag)
        let decryptedBuffers = [decipher.update(encrypted)]
        decryptedBuffers.push(decipher.final())
        return concatUint8Arrays(decryptedBuffers)
    }
}

function derivePrivateKey(seed, index) {

    if (isHex(seed)) {
       seed = hexToUint8Array(seed)
    }

    //Derive master keys
    const hash = createHash("sha512")
    hash.update(seed)
    buf = hash.digest()
    
    masterKey = buf.slice(0, 32)
    masterEntropy = buf.slice(32, 64)

    //Derive the final seed
    const hmac = createHmac('sha512', masterEntropy)
    index_buf = encodeInt32(index)
    extended_seed = concatUint8Arrays([masterKey, index_buf])
    hmac.update(extended_seed)
    hmac_buf = hmac.digest()

    // The first 32 bytes become the next private key
    return hmac_buf.slice(0, 32)
}

function deriveSecret(sharedKey) {

    if (typeof(sharedKey) !== "string" && !(sharedKey instanceof Uint8Array)) {
        throw "'sharedKey' must be a string or Uint8Array"
    }

    if (typeof(sharedKey) == "string") {
        if(isHex(sharedKey)) {
            sharedKey = hexToUint8Array(sharedKey)
        } else {
            throw "'sharedKey' must be an hexadecimal string"
        }
    }

    hash = createHash("sha256")
    hash.update(sharedKey)
    pseudoRandomKey = hash.digest()
    
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

function aesAuthEncrypt(data, aesKey, iv) {
  let cipher = createCipheriv("aes-256-gcm", aesKey, iv)
  encrypted = cipher.update(data)
  encrypted = concatUint8Arrays([ encrypted, cipher.final()])
  
  return { tag: new Uint8Array(cipher.getAuthTag()), encrypted: encrypted }
}

function aesAuthDecrypt(encrypted, aesKey, iv, tag) {
  let cipher = createDecipheriv("aes-256-gcm", aesKey, iv)
  cipher.setAuthTag(tag)
  
  let decrypted = cipher.update(encrypted)
  decrypted += cipher.final()

  return decrypted
}
