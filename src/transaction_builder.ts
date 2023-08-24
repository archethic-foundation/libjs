import {
    AuthorizedKey,
    AuthorizedKeyUserInput,
    Curve,
    HashAlgorithm,
    TransactionData,
    UserTypeTransaction,
    TransactionRPC
} from "./types.js"
import {
    bigIntToUint8Array,
    concatUint8Arrays,
    intToUint8Array,
    maybeHexToUint8Array,
    maybeStringToUint8Array,
    toByteArray,
    uint8ArrayToHex
} from "./utils.js";
import { deriveAddress, deriveKeyPair, sign } from "./crypto.js";

const VERSION = 2

function getTransactionTypeId(type: UserTypeTransaction): number {
    switch (type) {
        case UserTypeTransaction.keychain:
            return 255
        case UserTypeTransaction.keychain_access:
            return 254
        case UserTypeTransaction.transfer:
            return 253
        case UserTypeTransaction.hosting:
            return 252
        case UserTypeTransaction.token:
            return 251
        case UserTypeTransaction.data:
            return 250
        case UserTypeTransaction.contract:
            return 249
        case UserTypeTransaction.code_proposal:
            return 5
        case UserTypeTransaction.code_approval:
            return 6
    }
}


export default class TransactionBuilder {
    public version: number;
    public type: UserTypeTransaction;
    public address: Uint8Array;
    public data: TransactionData;
    public previousPublicKey: Uint8Array;
    public previousSignature: Uint8Array;
    public originSignature: Uint8Array;


    /**
     * Create a new instance of the transaction builder
     */
    constructor(type: UserTypeTransaction | string = UserTypeTransaction.transfer) {
        this.version = VERSION
        this.type = type as UserTypeTransaction;
        this.address = new Uint8Array()
        this.data = {
            content: new Uint8Array(),
            code: new Uint8Array(),
            ownerships: [],
            ledger: {
                uco: {
                    transfers: []
                },
                token: {
                    transfers: []
                }
            },
            recipients: []
        }
        this.previousPublicKey = new Uint8Array()
        this.previousSignature = new Uint8Array()
        this.originSignature = new Uint8Array()
    }

    /**
     * Set the type of the transaction
     * @param {String} type Transaction type
     */
    setType(type: UserTypeTransaction | string) {
        if (!Object.keys(UserTypeTransaction).includes(type)) {
            throw "Transaction type must be one of " + Object.keys(UserTypeTransaction).map(t => `'${t}'`).join(", ")
        }
        this.type = type as UserTypeTransaction;
        return this
    }

    /**
     * Add smart contract code to the transcation
     * @param {string} code Smart contract code
     */
    setCode(code: string) {
        this.data.code = new TextEncoder().encode(code)
        return this
    }

    /**
     * Add a content to the transaction
     * @param {String | Uint8Array} content Hosted content
     */
    setContent(content: string | Uint8Array) {
        if (typeof (content) == "string") {
            content = new TextEncoder().encode(content)
        }
        this.data.content = content;
        return this
    }

    /**
     * Add an ownership with a secret and its authorized public keys
     * @param {string | Uint8Array} secret Secret encrypted (hexadecimal or binary buffer)
     * @param {AuthorizedKeyUserInput[]} authorizedKeys List of authorized keys
     */
    addOwnership(secret: string | Uint8Array, authorizedKeys: AuthorizedKeyUserInput[]) {
        secret = maybeStringToUint8Array(secret)

        if (!Array.isArray(authorizedKeys)) {
            throw 'Authorized keys must be an array'
        }

        const filteredAuthorizedKeys: AuthorizedKey[] = []

        // remove duplicate keys
        const acc = new Map();
        authorizedKeys.forEach(({ publicKey, encryptedSecretKey }) => {

            if (acc.has(publicKey)) return;

            filteredAuthorizedKeys.push({ publicKey: maybeHexToUint8Array(publicKey), encryptedSecretKey: maybeHexToUint8Array(encryptedSecretKey) });

            acc.set(publicKey, encryptedSecretKey);
        });

        this.data.ownerships.push({
            secret: secret,
            authorizedPublicKeys: filteredAuthorizedKeys
        })

        return this
    }

    /**
     * Add a UCO transfer to the transaction
     * @param {string | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
     * @param {number} amount Amount of UCO to transfer (in bigint)
     */
    addUCOTransfer(to: string | Uint8Array, amount: number) {
        to = maybeHexToUint8Array(to)

        if (isNaN(amount) || amount <= 0) {
            throw 'UCO transfer amount must be a positive number'
        }

        this.data.ledger.uco.transfers.push({ to, amount })
        return this
    }

    /**
     * Add a token transfer to the transaction
     * @param {string | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
     * @param {number} amount Amount of UCO to transfer (in bigint)
     * @param {string | Uint8Array} tokenAddress Address of token to spend (hexadecimal or binary buffer)
     * @param {number} tokenId ID of the token to use (default to 0)
     */
    addTokenTransfer(to: string | Uint8Array, amount: number, tokenAddress: string | Uint8Array, tokenId: number = 0) {
        to = maybeHexToUint8Array(to)
        tokenAddress = maybeHexToUint8Array(tokenAddress)

        if (isNaN(amount) || amount <= 0) {
            throw 'Token transfer amount must be a positive number'
        }

        if (isNaN(tokenId) || tokenId < 0) {
            throw "'tokenId' must be a valid integer >= 0"
        }

        this.data.ledger.token.transfers.push({
            to: to,
            amount: amount,
            tokenAddress: tokenAddress,
            tokenId: tokenId
        })
        return this
    }

    /**
     * Add recipient to the transaction
     * @param {string | Uint8Array} to Recipient address (hexadecimal or binary buffer)
     */
    addRecipient(to: string | Uint8Array) {
        const address = maybeHexToUint8Array(to)

        this.data.recipients.push({ address })
        return this
    }

    /**
     * Add recipient to the transaction (with a named action)
     * @param {string | Uint8Array} to Recipient address (hexadecimal or binary buffer)
     * @param {string} action The named action
     * @param {any[]} args The arguments list for the named action (can only contain JSON valid data)
     */
    addRecipientWithNamedAction(to: string | Uint8Array, action: string, args: any[]) {
        const address = maybeHexToUint8Array(to)

        if (typeof action != 'string') {
            throw '`action` must be a string'
        }

        if (!Array.isArray(args)) {
            throw '`args` must be an array'
        }

        this.data.recipients.push({ address, action, args })
        return this
    }

    /**
     * Set the transaction builder with Previous Publickey and Previous Signature
     * @param {string | Uint8Array} prevSign Previous Signature (hexadecimal)
     * @param {string | Uint8Array} prevPubKey Previous PublicKey (hexadecimal)
     */
    setPreviousSignatureAndPreviousPublicKey(prevSign: string | Uint8Array, prevPubKey: string | Uint8Array) {
        prevSign = maybeHexToUint8Array(prevSign)
        prevPubKey = maybeHexToUint8Array(prevPubKey)

        this.previousPublicKey = prevPubKey;
        this.previousSignature = prevSign;
        return this
    }

    /**
     * Set the transaction builder with address (required for originSign)
     * @param {string | Uint8Array} addr Address (hexadecimal | Uint8Array)
     *
     */
    setAddress(addr: string | Uint8Array) {
        addr = maybeHexToUint8Array(addr)

        this.address = addr;
        return this
    }

    /**
     * Generate the transaction address, keys and signatures
     * @param {string | Uint8Array} seed Transaction chain seed (hexadecimal or binary buffer)
     * @param {number} index Number of transaction on the chain
     * @param {string} curve Elliptic curve to use for the key generation
     * @param {string} hashAlgo Hash algorithm to use for the address generation
     */
    build(seed: string | Uint8Array, index: number, curve: string = "ed25519", hashAlgo: string = "sha256") {
        if (!Object.keys(Curve).includes(curve)) {
            throw "Curve must be one of " + Object.keys(Curve).map(t => `'${t}'`).join(", ")
        }
        if (!Object.keys(HashAlgorithm).includes(hashAlgo)) {
            throw "Hash algorithm must be one of " + Object.keys(HashAlgorithm).map(t => `'${t}'`).join(", ")
        }

        const keypair = deriveKeyPair(seed, index, curve as Curve);
        this.address = deriveAddress(seed, index + 1, curve as Curve, hashAlgo as HashAlgorithm);
        this.previousPublicKey = keypair.publicKey

        const payloadForPreviousSignature = this.previousSignaturePayload()

        this.previousSignature = sign(payloadForPreviousSignature, keypair.privateKey)

        return this
    }

    /**
     * Sign the transaction with an origin private key
     * @param {string | Uint8Array} privateKey Origin Private Key (hexadecimal or binary buffer)
     */
    originSign(privateKey: string | Uint8Array) {
        privateKey = maybeHexToUint8Array(privateKey)

        this.originSignature = sign(this.originSignaturePayload(), privateKey)
        return this
    }

    /**
     * Set the Txn's originSignature, method called from hardware_libs
     * @param {string | Uint8Array} signature Origin Signature (hexadecimal or binary)
     */
    setOriginSign(signature: string | Uint8Array) {
        signature = maybeHexToUint8Array(signature)

        this.originSignature = signature
        return this
    }

    originSignaturePayload() {
        const payloadForPreviousSignature = this.previousSignaturePayload()
        return concatUint8Arrays(
            payloadForPreviousSignature,
            this.previousPublicKey,
            Uint8Array.from([this.previousSignature.length]),
            this.previousSignature,
        )
    }

    /**
     * Generate the payload for the previous signature by encoding address,  type and data
     */
    previousSignaturePayload() {

        const bufCodeSize = intToUint8Array(this.data.code.length)

        let contentSize = this.data.content.length


        const bufContentSize = intToUint8Array(contentSize)

        const ownershipsBuffer = this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {

            const bufAuthKeyLength = toByteArray(authorizedPublicKeys.length)
            const authorizedKeysBuffer = [Uint8Array.from([bufAuthKeyLength.length]), bufAuthKeyLength]

            // Sort authorized public key by alphabethic order
            authorizedPublicKeys.sort((a, b) => uint8ArrayToHex(a.publicKey).localeCompare(uint8ArrayToHex(b.publicKey)))

            authorizedPublicKeys.forEach(({ publicKey, encryptedSecretKey }) => {
                authorizedKeysBuffer.push(maybeHexToUint8Array(publicKey))
                authorizedKeysBuffer.push(maybeHexToUint8Array(encryptedSecretKey))
            })

            return concatUint8Arrays(
                intToUint8Array(secret.byteLength),
                secret,
                concatUint8Arrays(...authorizedKeysBuffer)
            )
        })

        const ucoTransfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
            return concatUint8Arrays(
                transfer.to,
                bigIntToUint8Array(transfer.amount)
            )
        })

        const tokenTransfersBuffers = this.data.ledger.token.transfers.map(function (transfer) {
            const bufTokenId = toByteArray(transfer.tokenId)
            return concatUint8Arrays(
                transfer.tokenAddress,
                transfer.to,
                bigIntToUint8Array(transfer.amount),
                Uint8Array.from([bufTokenId.length]),
                bufTokenId
            )
        })

        const recipientsBuffer = this.data.recipients.map(({ address, action, args }) => {
            if (action == undefined || args == undefined) {
                return concatUint8Arrays(
                    // 0 = unnamed action
                    Uint8Array.from([0]),
                    // address
                    address)
            } else {
                const jsonArgs = JSON.stringify(args)
                const bufJsonLength = toByteArray(jsonArgs.length)

                return concatUint8Arrays(
                    // 1 = named action
                    Uint8Array.from([1]),
                    // address
                    address,
                    // action
                    Uint8Array.from([action.length]),
                    new TextEncoder().encode(action),
                    // args
                    Uint8Array.from([bufJsonLength.length]),
                    bufJsonLength,
                    new TextEncoder().encode(jsonArgs),
                )

            }
        })

        const bufOwnershipLength = toByteArray(this.data.ownerships.length)
        const bufUCOTransferLength = toByteArray(this.data.ledger.uco.transfers.length)
        const bufTokenTransferLength = toByteArray(this.data.ledger.token.transfers.length)
        const bufRecipientLength = toByteArray(this.data.recipients.length)

        return concatUint8Arrays(
            intToUint8Array(VERSION),
            this.address,
            Uint8Array.from([getTransactionTypeId(this.type)]),
            bufCodeSize,
            this.data.code,
            bufContentSize,
            this.data.content,
            Uint8Array.from([bufOwnershipLength.length]),
            bufOwnershipLength,
            ...ownershipsBuffer,
            Uint8Array.from([bufUCOTransferLength.length]),
            bufUCOTransferLength,
            ...ucoTransfersBuffers,
            Uint8Array.from([bufTokenTransferLength.length]),
            bufTokenTransferLength,
            ...tokenTransfersBuffers,
            Uint8Array.from([bufRecipientLength.length]),
            bufRecipientLength,
            ...recipientsBuffer
        )
    }

    /**
     * JSON RPC API SEND_TRANSACTION
     * content is hexadecimal
     */
    toNodeRPC(): TransactionRPC {
        return {
            version: this.version,
            address: uint8ArrayToHex(this.address),
            type: this.type,
            data: {
                content: uint8ArrayToHex(this.data.content),
                code: new TextDecoder().decode(this.data.code),
                ownerships: this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {
                    return {
                        secret: uint8ArrayToHex(secret),
                        // TODO : authorizedPublicKeys or authorizedKeys ?
                        authorizedKeys: authorizedPublicKeys.map(({ publicKey, encryptedSecretKey }) => {
                            return {
                                publicKey: uint8ArrayToHex(publicKey),
                                encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
                            }
                        })
                    }
                }),
                ledger: {
                    uco: {
                        transfers: this.data.ledger.uco.transfers.map((t) => {
                            return {
                                to: uint8ArrayToHex(t.to),
                                amount: t.amount
                            }
                        })
                    },
                    token: {
                        transfers: this.data.ledger.token.transfers.map((t) => {
                            return {
                                to: uint8ArrayToHex(t.to),
                                amount: t.amount,
                                tokenAddress: uint8ArrayToHex(t.tokenAddress),
                                tokenId: t.tokenId
                            }
                        })
                    }
                },
                recipients: this.data.recipients.map(({ address, action, args }) => {
                    return {
                        address: uint8ArrayToHex(address),
                        action: action,
                        args: args
                    }
                })
            },
            previousPublicKey: uint8ArrayToHex(this.previousPublicKey),
            previousSignature: uint8ArrayToHex(this.previousSignature),
            originSignature: this.originSignature && uint8ArrayToHex(this.originSignature)
        }
    }

    /**
     * REST API (deprecated, replaced by JSON RPC API)
     * content is hexadecimal
     */
    toJSON(): string {
        return JSON.stringify(this.toNodeRPC())
    }

    /**
     * Wallet RPC API
     * content is normal
     * only transaction payload (no address/public key/signatures)
     */
    toRPC(): object {
        return {
            version: this.version,
            type: this.type,
            data: {
                content: new TextDecoder().decode(this.data.content),
                code: new TextDecoder().decode(this.data.code),
                ownerships: this.data.ownerships.map(({ secret, authorizedPublicKeys }) => {
                    return {
                        secret: uint8ArrayToHex(secret),
                        // TODO : authorizedPublicKeys or authorizedKeys ?
                        authorizedKeys: authorizedPublicKeys.map(({ publicKey, encryptedSecretKey }) => {
                            return {
                                publicKey: uint8ArrayToHex(publicKey),
                                encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
                            }
                        })
                    }
                }),
                ledger: {
                    uco: {
                        transfers: this.data.ledger.uco.transfers.map((t) => {
                            return {
                                to: uint8ArrayToHex(t.to),
                                amount: t.amount
                            }
                        })
                    },
                    token: {
                        transfers: this.data.ledger.token.transfers.map((t) => {
                            return {
                                to: uint8ArrayToHex(t.to),
                                amount: t.amount,
                                tokenAddress: uint8ArrayToHex(t.tokenAddress),
                                tokenId: t.tokenId
                            }
                        })
                    }
                },
                recipients: this.data.recipients.map(({ address, action, args }) => {
                    return {
                        address: uint8ArrayToHex(address),
                        action: action,
                        args: args
                    }
                })
            },
        }
    }
}
