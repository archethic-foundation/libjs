const UnirisCrypto = require('./crypto')
const { isHex} = require("./utils")

module.exports = class TransactionBuilder {

    /**
     * Create a new instance of the transaction builder by specifying firstly the type of transaction
     * @param {String} txType Transaction type ("identity", "keychain", "transfer", "hosting")
     */
    constructor(txType) {
        this.type = parseTransactionType(txType)
        this.data = {
            content: "",
            code: "",
            keys: {
                secret: Buffer.alloc(0),
                authorizedKeys: {}
            },
            ledger: {
                uco: {
                    transfers: []
                }
            },
            recipients: []
        }
    }
    
    /**
     * Add smart contract code to the transcation
     * @param {String} code Smart contract code
     */
    setCode(code) {
        this.data.code = code
        return this
    }

    /**
     * Add a content to the transaction
     * @param {String} content Hosted content
     */
    setContent(content) {
        this.data.content = content
        return this
    }

    /**
     * Add a secret to the transaction
    * @param {String | ArrayBuffer} secret Secret encrypted (hexadecimal or binary buffer)
     */
    setSecret(secret) {
        if (typeof(secret) == "string") {
            if (!isHex(secret)) {
                throw "'secret' must be in hexadecimal form if it's string"
            }
            secret = Buffer.from(secret, "hex")
        }
        this.data.keys.secret = secret
        return this
    }

    /**
     * Add an authorized public key for secret decryption to the transaction with its encrypted secret key
     * @param {String | ArrayBuffer} publicKey Authorized public key (hexadecimal or or binary buffer)
     * @param {String | ArrayBuffer} encryptedSecretKey Encrypted secret key for the given public key (hexadecimal or binary buffer)
     */
    addAuthorizedKey(publicKey, encryptedSecretKey) {

        if (typeof(publicKey) == "string") {
            if (!isHex(publicKey)) {
                throw "'publicKey' must be in hexadecimal form if it's string"
            }
            publicKey = Buffer.from(publicKey, "hex")
        }

        if (typeof(encryptedSecretKey) == "string") {
            if (!isHex(encryptedSecretKey)) {
                throw "'encryptedSecretKey' must be in hexadecimal form if it's string"
            }
            encryptedSecretKey = Buffer.from(encryptedSecretKey, 'hex')
        }

        this.data.keys.authorizedKeys[publicKey] = encryptedSecretKey
        return this
    }

    /**
     * Add a UCO transfer to the transaction
     * @param {String | ArrayBuffer} to Address of the recipient (hexadecimal or binary buffer)
     * @param {Float} amount Amount of UCO to transfer
     */
    addUCOTransfer(to, amount) {
        if (typeof(to) == "string") {
            if (!isHex(to)) {
                throw "'to' must be in hexadecimal form if it's string"
            }
            to = Buffer.from(to, "hex")
        }
        this.data.ledger.uco.transfers.push({
            to: to,
            amount: amount
        })
        return this
    }

    /**
     * Add recipient to the transaction
     * @param {String | ArrayBuffer} to Recipient address (hexadecimal or binary buffer) 
     */
    addRecipient(to) {
        if (typeof(to) == "string") {
            if (!isHex(to)) {
                throw "'to' must be in hexadecimal form if it's string"
            }
            to = Buffer.from(to, "hex")
        }
        this.data.recipients.push(to)
        return this
    }

    /**
     * Generate the transaction address, keys and signatures
     * @param {String | ArrayBuffer} seed Transaction chain seed (hexadecimal or binary buffer)
     * @param {Integer} index Number of transaction on the chain
     * @param {String | ArrayBuffer} originPv Origin Private Key (hexadecimal or binary buffer)
     * @param {String} curve Elliptic curve to use for the key generation
     * @param {String} hashAlgo Hash algorithm to use for the address generation
     */
    build(seed, index, originPv, curve, hashAlgo) {
        if (typeof(seed) == "string") {
            if (!isHex(seed)) {
                Buffer.from(seed)
            } else {
                Buffer.from(seed, "hex")
            }
        }

        if (typeof(originPv) == "string") {
            if (!isHex(originPv)) {
                throw "'originPv' must be in hexadecimal form if it's string"
            }
            originPv = Buffer.from(originPv, "hex")
        }

        const keypair = UnirisCrypto.derivateKeyPair(seed, index, curve);
        const nextKeypair = UnirisCrypto.derivateKeyPair(seed, index + 1)
        const address = UnirisCrypto.hash(nextKeypair.publicKey, hashAlgo)

        this.address = address
        this.previousPublicKey = keypair.publicKey
        this.timestamp = Math.floor(new Date() / 1000)

        const payload_for_previous_signature = this.previousSignaturePayload()
        this.previousSignature = UnirisCrypto.sign(payload_for_previous_signature, keypair.privateKey)

        const payload_for_origin_signature = Buffer.concat([
            payload_for_previous_signature,
            this.previousPublicKey,
            Buffer.alloc(1, this.previousSignature.length),
            this.previousSignature,
        ])

        this.originSignature = UnirisCrypto.sign(payload_for_origin_signature, originPv).toString('hex')

        this.address = this.address.toString('hex')
        this.previousPublicKey = this.previousPublicKey.toString('hex')
        this.previousSignature = this.previousSignature.toString('hex')

        for (const publicKey in this.data.keys.authorizedKeys) {
            this.data.keys.authorizedKeys[publicKey] = this.data.keys.authorizedKeys[publicKey].toString('hex')
        }

        this.data.keys.secret = this.data.keys.secret.toString('hex')

        return this
    }

    /**
     * Generate the payload for the previous signature by encoding address, timestamp, type and data
     */
    previousSignaturePayload() {
        
        let buf_timestamp = Buffer.alloc(4)
        buf_timestamp.writeUInt32BE(this.timestamp)

        let buf_code_size = Buffer.alloc(4)
        buf_code_size.writeUInt32BE(this.data.code.length)

        let buf_content_size = Buffer.alloc(4)
        buf_content_size.writeUInt32BE(this.data.content.length)

        let buf_secret_size = Buffer.alloc(4)
        buf_secret_size.writeUInt32BE(this.data.keys.secret.length)

        let authorizedKeysBuffers = []
        for (const publicKey in this.data.keys.authorizedKeys) {
            authorizedKeysBuffers.push(
                Buffer.concat([
                    publicKey,
                    this.data.keys.authorizedKeys[publicKey]
                ])
            )
        }

        let transfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
            let amount_but = Buffer.alloc(8)
            amount_but.writeDoubleBE(transfer.to)
            return Buffer.concat([
                transfer.to,
                amount_but
            ])
        })

        return Buffer.concat([
            Buffer.from(this.address),
            Buffer.alloc(1, serializeTxType(this.type)),
            buf_timestamp,
            buf_code_size,
            Buffer.from(this.data.code),
            buf_content_size,
            Buffer.from(this.data.content),
            buf_secret_size,
            this.data.keys.secret,
            Buffer.alloc(1, Object.keys(this.data.keys.authorizedKeys).length),
            Buffer.concat(authorizedKeysBuffers),
            Buffer.alloc(1, this.data.ledger.uco.transfers.length),
            Buffer.concat(transfersBuffers),
            Buffer.alloc(1, this.data.recipients.length),
            Buffer.concat(this.data.recipients)
        ])
    }
}

function serializeTxType(type) {
    switch(type) {
        case "identity": 
            return 0
        case "keychain":
            return 1
        case "transfer":
            return 2
        case "hosting":
            return 8
        default:
            throw "Transaction type must be 'transfer', 'hosting', 'identity', 'keychain'"
    }   
}

function parseTransactionType(type) {
    switch(type) {  
        case "transfer":
            return "transfer"
        case "keychain":
            return "keychain"
        case "identity":
            return "identity"
        case "hosting":
            return "hosting"
        default:
            throw "Transaction type must be 'transfer', 'hosting', 'identity', 'keychain'"
    }
}