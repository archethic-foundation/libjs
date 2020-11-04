const UnirisCrypto = require('./crypto')
const { isHex} = require("./utils")
const bigInt = require('bigint-buffer')

const txTypes = {
    "identity": 0,
    "keychain": 1,
    "transfer": 2,
    "hosting": 7,
    "code_proposal": 8,
    "code_approval": 9
}

module.exports = class TransactionBuilder {

    /**
     * Create a new instance of the transaction builder by specifying firstly the type of transaction
     * @param {String} txType Transaction type ("identity", "keychain", "transfer", "hosting", "code_proposal", "code_approval")
     */
    constructor(txType) {

        if (!Object.keys(txTypes).includes(txType)) {
            throw "Transaction type must be 'transfer', 'hosting', 'identity', 'keychain', 'code_proposal', 'code_approval'"
        }

        this.type = txType
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
     * @param {String | ArrayBuffer} content Hosted content
     */
    setContent(content) {
        this.data.content = Buffer.from(content)
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

        if (isNaN(amount)) {
            throw 'UCO transfer amount must be a number'
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
     * @param {String} curve Elliptic curve to use for the key generation
     * @param {String} hashAlgo Hash algorithm to use for the address generation
     */
    build(seed, index, curve, hashAlgo) {
        const keypair = UnirisCrypto.deriveKeyPair(seed, index, curve);
        const nextKeypair = UnirisCrypto.deriveKeyPair(seed, index + 1)
        const address = UnirisCrypto.hash(nextKeypair.publicKey, hashAlgo)

        this.address = address
        this.previousPublicKey = keypair.publicKey
        this.timestamp = new Date().getTime()

        const payload_for_previous_signature = this.previousSignaturePayload()
        this.previousSignature = UnirisCrypto.sign(payload_for_previous_signature, keypair.privateKey)

        return this
    }

    /**
     * Sign the transaction with an origin private key
     * @param {String | ArrayBuffer} originPv Origin Private Key (hexadecimal or binary buffer)
     */
    originSign(privateKey) {
        if (typeof(privateKey) == "string") {
            if (!isHex(privateKey)) {
                throw "'privateKey' must be in hexadecimal form if it's string"
            }
            privateKey = Buffer.from(privateKey, "hex")
        }

        const payload_for_previous_signature = this.previousSignaturePayload()
        const payload_for_origin_signature = Buffer.concat([
            payload_for_previous_signature,
            this.previousPublicKey,
            Buffer.alloc(1, this.previousSignature.length),
            this.previousSignature,
        ])
        this.originSignature = UnirisCrypto.sign(payload_for_origin_signature, privateKey)
        return this
    }

    /**
     * Convert the transaction in JSON
     */
    toJSON() {
        return JSON.stringify({
            address: this.address.toString('hex'),
                type: this.type,
                timestamp: this.timestamp,
                data: {
                    content: this.data.content.toString('hex'),
                    code: this.data.code,
                    keys: {
                        secret: this.data.keys.secret.toString('hex'),
                        authorizedKeys: hexAuthorizedKeys(this.data.keys.authorizedKeys)
                    },
                    ledger: {
                        uco: {
                            transfers: this.data.ledger.uco.transfers.map((t) => {
                                return {
                                    to: t.to.toString('hex'),
                                    amount: t.amount
                                }
                            })
                        }
                    },
                    recipients: this.data.recipients.map((r) => r.toString('hex'))
                },
                previousPublicKey: this.previousPublicKey.toString('hex'),
                previousSignature: this.previousSignature.toString('hex'),
                originSignature: this.originSignature && this.originSignature.toString('hex')
        })
    }

    /**
     * Generate the payload for the previous signature by encoding address, timestamp, type and data
     */
    previousSignaturePayload() {
        
        const buf_timestamp = bigInt.toBufferBE(BigInt(this.timestamp), 8)

        const buf_code_size = Buffer.alloc(4)
        buf_code_size.writeUInt32BE(Buffer.from(this.data.code).length)

        const buf_content_size = Buffer.alloc(4)
        buf_content_size.writeUInt32BE(Buffer.from(this.data.content).length)

        const buf_secret_size = Buffer.alloc(4)
        buf_secret_size.writeUInt32BE(Buffer.from(this.data.keys.secret).length)

        let authorizedKeysBuffers = []
        for (const publicKey in this.data.keys.authorizedKeys) {
            authorizedKeysBuffers.push(
                Buffer.concat([
                    publicKey,
                    this.data.keys.authorizedKeys[publicKey]
                ])
            )
        }

        const transfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
            const amount_buf = Buffer.alloc(8)
            amount_buf.writeDoubleBE(amount, 0)
            return Buffer.concat([
                transfer.to,
                amount_buf
            ])
        })

        return Buffer.concat([
            Buffer.from(this.address),
            Buffer.alloc(1, txTypes[this.type]),
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

function hexAuthorizedKeys(autorizedKeys) {
    let authorizedKeysHex = []
    for (const publicKey in autorizedKeys) {
        authorizedKeysHex[publicKey.toString('hex')] = autorizedKeys[publicKey].toString('hex')
    }
    return authorizedKeysHex
}