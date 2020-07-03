const UnirisCrypto = require('./crypto')

module.exports = class TransactionBuilder {

    constructor(txType) {
        this.type = parseTransactionType(txType)
        this.data = {
            content: "",
            code: "",
            keys: {
                secret: "",
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
    
    setCode(code) {
        this.data.code = code
        return this
    }

    setContent(content) {
        this.data.content = content
        return this
    }

    setSecret(secret) {
        this.data.keys.secret = Buffer.from(secret)
        return this
    }

    addAuthorizedKey(publicKey, encryptedKey) {
        this.data.keys.authorizedKeys[publicKey] = Buffer.from(encryptedKey)
        return this
    }

    addUCOTransfer(to, amount) {
        this.data.ledger.uco.transfers.push({
            to: to,
            amount: amount
        })
        return this
    }

    build(seed, index, originPv) {
        const keypair = UnirisCrypto.derivateKeyPair(seed, index);
        const nextKeypair = UnirisCrypto.derivateKeyPair(seed, index + 1)
        const address = UnirisCrypto.hash(nextKeypair.publicKey)

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

        if (this.data.keys.secret != "") {
            this.data.keys.secret = this.data.keys.secret.toString('hex')
        }

        return this
    }

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
            const encryptedSecretKey = this.data.keys.authorizedKeys[publicKey]
            const pubBuf = Buffer.from(publicKey, 'hex')
            authorizedKeysBuffers.push(
                Buffer.concat([
                    pubBuf,
                    encryptedSecretKey
                ])
            )
        }

        let transfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
            let amount_but = Buffer.alloc(8)
            amount_but.writeDoubleBE(transfer.to)
            return Buffer.concat([
                Buffer.from(transfer.to, "hex"),
                amount_but
            ])
        })

        let recipientBuffers = this.data.recipients.map(function (recipient) {
            return Buffer.from(recipient, "hex")
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
            Buffer.from(this.data.keys.secret),
            Buffer.alloc(1, Object.keys(this.data.keys.authorizedKeys).length),
            Buffer.concat(authorizedKeysBuffers),
            Buffer.alloc(1, this.data.ledger.uco.transfers.length),
            Buffer.concat(transfersBuffers),
            Buffer.alloc(1, this.data.recipients.length),
            Buffer.concat(recipientBuffers)
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