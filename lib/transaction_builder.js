const Crypto = require('./crypto')
const { isHex, hexToUint8Array, uint8ArrayToHex, concatUint8Arrays, encodeInt32, encodeInt64, encodeFloat64} = require("./utils")

const txTypes = {
    "identity": 0,
    "keychain": 1,
    "transfer": 2,
    "hosting": 6,
    "code_proposal": 7,
    "code_approval": 8,
    "nft": 9
}

module.exports = class TransactionBuilder {

    /**
     * Create a new instance of the transaction builder by specifying firstly the type of transaction
     * @param {String} txType Transaction type ("identity", "keychain", "transfer", "hosting", "code_proposal", "code_approval", "nft")
     */
    constructor(txType) {

        if (!Object.keys(txTypes).includes(txType)) {
            throw "Transaction type must be 'transfer', 'hosting', 'identity', 'keychain', 'code_proposal', 'code_approval', 'nft"
        }

        this.type = txType
        this.data = {
            content: new Uint8Array(),
            code: new Uint8Array(),
            keys: {
                secret: new Uint8Array(),
                authorizedKeys: {}
            },
            ledger: {
                uco: {
                    transfers: []
                },
                nft: {
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
        if (typeof(code) !== "string") {
          throw "'code' must be a string"
        }
        this.data.code = new TextEncoder().encode(code)
        return this
    }

    /**
     * Add a content to the transaction
     * @param {String | Uint8Array} content Hosted content
     */
    setContent(content) {

        if (typeof(content) !== "string" && !content instanceof Uint8Array) {
            throw "'content' must be a string or Uint8Array"
        }

        if (typeof(content) == "string") {
          content = new TextEncoder().encode(content)
        }
        this.data.content = content;
        return this
    }

    /**
     * Add a secret to the transaction
    * @param {String | Uint8Array} secret Secret encrypted (hexadecimal or binary buffer)
     */
    setSecret(secret) {

        if (typeof(secret) !== "string" && !secret instanceof Uint8Array) {
            throw "'content' must be a string or Uint8Array"
        }

        if (typeof(secret) == "string") {
            if (isHex(secret)) {
                secret = hexToUint8Array(secret)
            } else {
                secret = new TextEncoder().encode(secret)
            }
            
        }
        this.data.keys.secret = secret
        return this
    }

    /**
     * Add an authorized public key for secret decryption to the transaction with its encrypted secret key
     * @param {String | Uint8Array} publicKey Authorized public key (hexadecimal or or binary buffer)
     * @param {String | Uint8Array} encryptedSecretKey Encrypted secret key for the given public key (hexadecimal or binary buffer)
     */
    addAuthorizedKey(publicKey, encryptedSecretKey) {
        if (typeof(publicKey) !== "string" && !publicKey instanceof Uint8Array) {
            throw "'publicKey' must be a string or Uint8Array"
        }

        if (typeof(encryptedSecretKey) !== "string" && !encryptedSecretKey instanceof Uint8Array) {
            throw "'encryptedSecretKey' must be a string or Uint8Array"
        }

        if (typeof(publicKey) == "string") {
            if (!isHex(publicKey)) {
                throw "'publicKey' must be in hexadecimal form if it's string"
            }
            publicKey = hexToUint8Array(publicKey)
        }

        if (typeof(encryptedSecretKey) == "string") {
            if (!isHex(encryptedSecretKey)) {
                throw "'encryptedSecretKey' must be in hexadecimal form if it's string"
            }
            encryptedSecretKey = hexToUint8Array(encryptedSecretKey)
        }

        this.data.keys.authorizedKeys[uint8ArrayToHex(publicKey)] = encryptedSecretKey
        return this
    }

    /**
     * Add a UCO transfer to the transaction
     * @param {String | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
     * @param {Float} amount Amount of UCO to transfer
     */
    addUCOTransfer(to, amount) {
        if (typeof(to) !== "string" && !to instanceof Uint8Array) {
            throw "'to' must be a string or Uint8Array"
        }

        if (typeof(to) == "string") {
            if (!isHex(to)) {
                throw "'to' must be in hexadecimal form if it's string"
            }
            to = hexToUint8Array(to)
        }

        if (isNaN(amount) && amount > 0.0) {
            throw 'UCO transfer amount must be a number'
        }

        this.data.ledger.uco.transfers.push({
            to: to,
            amount: amount
        })
        return this
    }

    /**
     * Add a NFT transfer to the transaction
     * @param {String | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
     * @param {Float} amount Amount of UCO to transfer
     * @param {String | Uint8Array} nft_address Address of NFT to spend (hexadecimal or binary buffer)
     */
    addNFTTransfer(to, amount, nft_address) {
        if (typeof(to) !== "string" && !to instanceof Uint8Array) {
            throw "'to' must be a string or Uint8Array"
        }

        if (typeof(nft_address) !== "string" && !nft_address instanceof Uint8Array) {
            throw "'nft_address' must be a string or Uint8Array"
        }

        if (typeof(to) == "string") {
            if (!isHex(to)) {
                throw "'to' must be in hexadecimal form if it's string"
            }
            to = hexToUint8Array(to)
        }

        if (isNaN(amount) && amount > 0.0) {
            throw 'NFT transfer amount must be a positive number'
        }

        if (typeof(nft_address) == "string") {
            if (!isHex(nft_address)) {
                throw "'nft_address' must be in hexadecimal form if it's string"
            }
            nft_address = hexToUint8Array(nft_address)
        }

        this.data.ledger.nft.transfers.push({
            to: to,
            amount: amount,
            nft: nft_address
        })
        return this
    }

    /**
     * Add recipient to the transaction
     * @param {String | Uint8Array} to Recipient address (hexadecimal or binary buffer) 
     */
    addRecipient(to) {
        if (typeof(to) !== "string" && !to instanceof Uint8Array) {
            throw "'to' must be a string or Uint8Array"
        }

        if (typeof(to) == "string") {
            if (!isHex(to)) {
                throw "'to' must be in hexadecimal form if it's string"
            }
            to = hexToUint8Array(to)
        }
        this.data.recipients.push(to)
        return this
    }

    /**
     * Generate the transaction address, keys and signatures
     * @param {String | Uint8Array} seed Transaction chain seed (hexadecimal or binary buffer)
     * @param {Integer} index Number of transaction on the chain
     * @param {String} curve Elliptic curve to use for the key generation
     * @param {String} hashAlgo Hash algorithm to use for the address generation
     */
    build(seed, index, curve, hashAlgo) {
        const keypair = Crypto.deriveKeyPair(seed, index, curve);
        const nextKeypair = Crypto.deriveKeyPair(seed, index + 1, curve)
        const address = Crypto.hash(nextKeypair.publicKey, hashAlgo)

        this.address = address
        this.previousPublicKey = keypair.publicKey

        const payload_for_previous_signature = this.previousSignaturePayload()
        this.previousSignature = Crypto.sign(payload_for_previous_signature, keypair.privateKey)

        return this
    }

    /**
     * Sign the transaction with an origin private key
     * @param {String | Uint8Array} originPv Origin Private Key (hexadecimal or binary buffer)
     */
    originSign(privateKey) {
        if (typeof(privateKey) !== "string" && !privateKey instanceof Uint8Array) {
            throw "'privateKey' must be a string or Uint8Array"
        }

        if (typeof(privateKey) == "string") {
            if (!isHex(privateKey)) {
                throw "'privateKey' must be in hexadecimal form if it's string"
            }
            privateKey = hexToUint8Array(privateKey)
        }

        this.originSignature = Crypto.sign(this.originSignaturePayload(), privateKey)
        return this
    }

    /**
     * Convert the transaction in JSON
     */
    toJSON() {
        return JSON.stringify({
            address: uint8ArrayToHex(this.address),
                type: this.type,
                data: {
                    content: uint8ArrayToHex(this.data.content),
                    code: new TextDecoder().decode(this.data.code),
                    keys: {
                        secret: uint8ArrayToHex(this.data.keys.secret),
                        authorizedKeys: hexAuthorizedKeys(this.data.keys.authorizedKeys)
                    },
                    ledger: {
                        uco: {
                            transfers: this.data.ledger.uco.transfers.map((t) => {
                                return {
                                    to: uint8ArrayToHex(t.to),
                                    amount: t.amount
                                }
                            })
                        },
                        nft: {
                            transfers: this.data.ledger.nft.transfers.map((t) => {
                                return {
                                    to: uint8ArrayToHex(t.to),
                                    amount: t.amount,
                                    nft: uint8ArrayToHex(t.nft)
                                }
                            })
                        }
                    },
                    recipients: this.data.recipients.map((r) => uint8ArrayToHex(r))
                },
                previousPublicKey: uint8ArrayToHex(this.previousPublicKey),
                previousSignature: uint8ArrayToHex(this.previousSignature),
                originSignature: this.originSignature && uint8ArrayToHex(this.originSignature)
        })
    }

    /**
     * Generate the payload for the previous signature by encoding address, timestamp, type and data
     */
    previousSignaturePayload() {
        
        const buf_code_size = encodeInt32(this.data.code.length)
        const buf_content_size = encodeInt32(this.data.content.length)
        const buf_secret_size = encodeInt32(this.data.keys.secret.length)

        let authorizedKeysBuffers = []
        for (const publicKey in this.data.keys.authorizedKeys) {
            authorizedKeysBuffers.push(
                concatUint8Arrays([
                    hexToUint8Array(publicKey),
                    this.data.keys.authorizedKeys[publicKey]
                ])
            )
        }

        const ucoTransfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
            return concatUint8Arrays([
                transfer.to,
                encodeFloat64(transfer.amount)
            ])
        })

        const nftTransfersBuffers = this.data.ledger.nft.transfers.map(function (transfer) {
            return concatUint8Arrays([
                transfer.nft,
                transfer.to,
                encodeFloat64(transfer.amount)
            ])

        })

        return concatUint8Arrays([
            this.address,
            Uint8Array.from([txTypes[this.type]]),
            buf_code_size,
            this.data.code,
            buf_content_size,
            this.data.content,
            buf_secret_size,
            this.data.keys.secret,
            Uint8Array.from([Object.keys(this.data.keys.authorizedKeys).length]),
            concatUint8Arrays(authorizedKeysBuffers),
            Uint8Array.from([this.data.ledger.uco.transfers.length]),
            concatUint8Arrays(ucoTransfersBuffers),
            Uint8Array.from([this.data.ledger.nft.transfers.length]),
            concatUint8Arrays(nftTransfersBuffers),
            Uint8Array.from([this.data.recipients.length]),
            concatUint8Arrays(this.data.recipients) 
        ])
    }

    originSignaturePayload() {
        const payload_for_previous_signature = this.previousSignaturePayload()
        return concatUint8Arrays([
            payload_for_previous_signature,
            this.previousPublicKey,
            Uint8Array.from([this.previousSignature.length]),
            this.previousSignature,
        ])
    }
}

function hexAuthorizedKeys(authorizedKeys) {
    let authorizedKeysHex = {}
    for (const publicKey in authorizedKeys) {
        authorizedKeysHex[publicKey] = uint8ArrayToHex(authorizedKeys[publicKey])
    }
    return authorizedKeysHex
}
