import { deriveKeyPair, deriveAddress, sign } from './crypto.js'
import { isHex, hexToUint8Array, uint8ArrayToHex, concatUint8Arrays, encodeInt32, encodeInt64, toBigInt, toByteArray } from './utils.js'

const version = 1

const txTypes = {
  //User based transaction types
  "keychain_access": 254,
  "keychain": 255,
  "transfer": 253,
  "hosting": 252,
  "token": 251,
  //Network based transaction types
  "code_proposal": 7,
  "code_approval": 8
}

export default class TransactionBuilder {

  /**
   * Create a new instance of the transaction builder
   */
  constructor(txType) {
    this.version = version
    this.type = "transfer"
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
  }

  /**
   * Set the type of the transaction
   * @param {String} type Transaction type
   */
  setType(type) {
    if (!Object.keys(txTypes).includes(type)) {
      throw "Transaction type must be 'transfer', 'hosting', 'keychain_access', 'keychain',  'token', 'code_proposal', 'code_approval'"
    }
    this.type = type
    return this
  }

  /**
   * Add smart contract code to the transcation
   * @param {String} code Smart contract code
   */
  setCode(code) {
    if (typeof (code) !== "string") {
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

    if (typeof (content) !== "string" && !(content instanceof Uint8Array)) {
      throw "'content' must be a string or Uint8Array"
    }

    if (typeof (content) == "string") {
      content = new TextEncoder().encode(content)
    }
    this.data.content = content;
    return this
  }

  /**
   * Add an ownership with a secret and its authorized public keys
   * @param {String | Uint8Array} secret Secret encrypted (hexadecimal or binary buffer)
   * @param {Array} authorizedKeys List of authorized keys
   */
  addOwnership(secret, authorizedKeys) {

    if (typeof (secret) !== "string" && !(secret instanceof Uint8Array)) {
      throw "'secret' must be a string or Uint8Array"
    }

    if (typeof (secret) == "string") {
      if (isHex(secret)) {
        secret = hexToUint8Array(secret)
      } else {
        secret = new TextEncoder().encode(secret)
      }
    }

    if (typeof (authorizedKeys) !== "object" && !(authorizedKeys instanceof Array)) {
      throw "'authorizedKeys must be an array"
    }

    const filteredAuthorizedKeys = []

    // Remove duplicated public key
    authorizedKeys.reduce((acc, { publicKey, encryptedSecretKey }) => {
      if (typeof (publicKey) !== "string" && !(publicKey instanceof Uint8Array)) {
        throw "Authorized public key must be a string or Uint8Array"
      }

      if (typeof (publicKey) == "string") {
        if (!isHex(publicKey)) {
          throw "Authorized public key must be an hexadecimal"
        }
        publicKey = hexToUint8Array(publicKey)
      }

      if (typeof (encryptedSecretKey) !== "string" && !(encryptedSecretKey instanceof Uint8Array)) {
        throw "Encrypted secret key must be a string or Uint8Array"
      }

      if (typeof (encryptedSecretKey) == "string") {
        if (!isHex(encryptedSecretKey)) {
          throw "Encrypted secret key must be an hexadecimal"
        }
        encryptedSecretKey = hexToUint8Array(encryptedSecretKey)
      }

      if (acc[publicKey]) return acc

      filteredAuthorizedKeys.push({publicKey, encryptedSecretKey})

      acc[publicKey] = encryptedSecretKey

      return acc
    }, {})

    this.data.ownerships.push({
      secret: secret,
      authorizedKeys: filteredAuthorizedKeys
    })

    return this
  }

  /**
   * Add a UCO transfer to the transaction
   * @param {String | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
   * @param {Integrer} amount Amount of UCO to transfer (in bigint)
   */
  addUCOTransfer(to, amount) {
    if (typeof (to) !== "string" && !(to instanceof Uint8Array)) {
      throw "'to' must be a string or Uint8Array"
    }

    if (typeof (to) == "string") {
      if (!isHex(to)) {
        throw "'to' must be in hexadecimal form if it's string"
      }
      to = hexToUint8Array(to)
    }

    if (isNaN(amount) || amount <= 0) {
      throw 'UCO transfer amount must be a positive number'
    }

    this.data.ledger.uco.transfers.push({to, amount})
    return this
  }

  /**
   * Add a token transfer to the transaction
   * @param {String | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
   * @param {Integer} amount Amount of UCO to transfer (in bigint)
   * @param {String | Uint8Array} tokenAddress Address of token to spend (hexadecimal or binary buffer)
   * @param {Integer} tokenId ID of the token to use (default to 0)
   */
  addTokenTransfer(to, amount, tokenAddress, tokenId = 0) {
    if (typeof (to) !== "string" && !(to instanceof Uint8Array)) {
      throw "'to' must be a string or Uint8Array"
    }

    if (typeof (tokenAddress) !== "string" && !(tokenAddress instanceof Uint8Array)) {
      throw "'tokenAddress' must be a string or Uint8Array"
    }

    if (typeof (to) == "string") {
      if (!isHex(to)) {
        throw "'to' must be in hexadecimal form if it's string"
      }
      to = hexToUint8Array(to)
    }

    if (isNaN(amount) || amount <= 0) {
      throw 'Token transfer amount must be a positive number'
    }

    if (typeof (tokenAddress) == "string") {
      if (!isHex(tokenAddress)) {
        throw "'tokenAddress' must be in hexadecimal form if it's string"
      }
      tokenAddress = hexToUint8Array(tokenAddress)
    }

    if (isNaN(tokenId) || tokenId < 0) {
      throw "'tokenId' must be a valid integer >= 0"
    }

    this.data.ledger.token.transfers.push({
      to: to,
      amount: amount,
      token: tokenAddress,
      tokenId: tokenId
    })
    return this
  }

  /**
   * Add recipient to the transaction
   * @param {String | Uint8Array} to Recipient address (hexadecimal or binary buffer) 
   */
  addRecipient(to) {
    if (typeof (to) !== "string" && !(to instanceof Uint8Array)) {
      throw "'to' must be a string or Uint8Array"
    }

    if (typeof (to) == "string") {
      if (!isHex(to)) {
        throw "'to' must be in hexadecimal form if it's string"
      }
      to = hexToUint8Array(to)
    }
    this.data.recipients.push(to)
    return this
  }

  /**
  * Set the transaction builder with Previous Publickey and Previous Signature
  * @param {String | Uint8Array} to Previous Signature (hexadecimal)
  * @param {String | Uint8Array} to Previous PublicKey (hexadecimal)
  */

  setPreviousSignatureAndPreviousPublicKey(prevSign, prevPubKey) {

    if (typeof (prevSign) !== "string" && !(prevSign instanceof Uint8Array)) {
      throw "'prevSign' must be a string or Uint8Array"
    }

    if (typeof (prevPubKey) !== "string" && !(prevPubKey instanceof Uint8Array)) {
      throw "'prevPubKey' must be a string or Uint8Array"
    }

    if (typeof (prevSign) == "string") {
      if (!isHex(prevSign)) {
        throw "'previous Signature' must be in hexadecimal form if it's string"
      }
      prevSign = hexToUint8Array(prevSign);
    }
    if (typeof (prevPubKey) == "string") {
      if (!isHex(prevPubKey)) {
        throw "'previous Public Key' must be in hexadecimal form if it's string"
      }
      prevPubKey = hexToUint8Array(prevPubKey);
    }

    this.previousPublicKey = prevPubKey;
    this.previousSignature = prevSign;
    return this
  }

  /**
  * Set the transaction builder with address (required for originSign) 
  * @param {String | Uint8Array} to Address (hexadecimal | Uint8Array)
  * 
  */

  setAddress(addr) {
    if (typeof (addr) !== "string" && !(addr instanceof Uint8Array)) {
      throw "'addr' must be a string or Uint8Array"
    }

    if (typeof (addr) == "string") {
      if (!isHex(addr)) {
        throw "'addr' must be in hexadecimal form if it's string"
      }
      addr = hexToUint8Array(addr)
    }
    this.address = addr;
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
    const keypair = deriveKeyPair(seed, index, curve);
    const address = deriveAddress(seed, index + 1, curve, hashAlgo)
    this.address = address
    this.previousPublicKey = keypair.publicKey

    const payloadForPreviousSignature = this.previousSignaturePayload()

    this.previousSignature = sign(payloadForPreviousSignature, keypair.privateKey)

    return this
  }

  /**
   * Sign the transaction with an origin private key
   * @param {String | Uint8Array} originPv Origin Private Key (hexadecimal or binary buffer)
   */
  originSign(privateKey) {
    if (typeof (privateKey) !== "string" && !(privateKey instanceof Uint8Array)) {
      throw "'privateKey' must be a string or Uint8Array"
    }

    if (typeof (privateKey) == "string") {
      if (!isHex(privateKey)) {
        throw "'privateKey' must be in hexadecimal form if it's string"
      }
    }

    this.originSignature = sign(this.originSignaturePayload(), privateKey)
    return this
  }

  /**
   * Set the Txn's originSignature, method called from hardware_libs
   * @param {String | Uint8Array} to Signature (hexadecimal)
   */
  setOriginSign(signature) {
    if (typeof (signature) !== "string" && !(signature instanceof Uint8Array)) {
      throw "'signature' must be a string or Uint8Array"
    }

    if (typeof (signature) == "string") {
      if (!isHex(signature)) {
        throw "'Signature' must be in hexadecimal form if it's string"
      }
      signature = hexToUint8Array(signature);
    }

    this.originSignature = signature
    return this
  }


  /**
   * Convert the transaction in JSON
   */
  toJSON() {
    return JSON.stringify({
      version: this.version,
      address: uint8ArrayToHex(this.address),
      type: this.type,
      data: {
        content: uint8ArrayToHex(this.data.content),
        code: new TextDecoder().decode(this.data.code),
        ownerships: this.data.ownerships.map(({ secret, authorizedKeys }) => {
          return {
            secret: uint8ArrayToHex(secret),
            authorizedKeys: authorizedKeys.map(({ publicKey, encryptedSecretKey }) => {
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
                tokenAddress: uint8ArrayToHex(t.token),
                tokenId: t.tokenId
              }
            })
          }
        },
        recipients: this.data.recipients.map(uint8ArrayToHex)
      },
      previousPublicKey: uint8ArrayToHex(this.previousPublicKey),
      previousSignature: uint8ArrayToHex(this.previousSignature),
      originSignature: this.originSignature && uint8ArrayToHex(this.originSignature)
    })
  }

  /**
   * Generate the payload for the previous signature by encoding address,  type and data
   */
  previousSignaturePayload() {

    const bufCodeSize = encodeInt32(this.data.code.length)

    let contentSize = this.data.content.length
    if (this.data.content instanceof ArrayBuffer) {
      contentSize = this.data.content.byteLength
    }

    const bufContentSize = encodeInt32(contentSize)

    const ownershipsBuffer = this.data.ownerships.map(({ secret, authorizedKeys }) => {

      const bufAuthKeyLength = Uint8Array.from(toByteArray(authorizedKeys.length))
      const authorizedKeysBuffer = [Uint8Array.from([bufAuthKeyLength.length]), bufAuthKeyLength]

      // Sort authorized public key by alphabethic order
      authorizedKeys.sort((a, b) => uint8ArrayToHex(a.publicKey).localeCompare(uint8ArrayToHex(b.publicKey)))

      authorizedKeys.forEach(({ publicKey, encryptedSecretKey }) => {
        authorizedKeysBuffer.push(publicKey)
        authorizedKeysBuffer.push(encryptedSecretKey)
      })

      return concatUint8Arrays([
        encodeInt32(secret.byteLength),
        secret,
        concatUint8Arrays(authorizedKeysBuffer)
      ])
    })

    const ucoTransfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
      return concatUint8Arrays([
        transfer.to,
        encodeInt64(transfer.amount)
      ])
    })

    const tokenTransfersBuffers = this.data.ledger.token.transfers.map(function (transfer) {
      const bufTokenId = Uint8Array.from(toByteArray(transfer.tokenId))
      return concatUint8Arrays([
        transfer.token,
        transfer.to,
        encodeInt64(transfer.amount),
        Uint8Array.from([bufTokenId.length]),
        bufTokenId
      ])
    })

    const bufOwnershipLength = Uint8Array.from(toByteArray(this.data.ownerships.length))
    const bufUCOTransferLength = Uint8Array.from(toByteArray(this.data.ledger.uco.transfers.length))
    const bufTokenTransferLength = Uint8Array.from(toByteArray(this.data.ledger.token.transfers.length))
    const bufRecipientLength = Uint8Array.from(toByteArray(this.data.recipients.length))

    return concatUint8Arrays([
      encodeInt32(version),
      this.address,
      Uint8Array.from([txTypes[this.type]]),
      bufCodeSize,
      this.data.code,
      bufContentSize,
      this.data.content,
      Uint8Array.from([bufOwnershipLength.length]),
      bufOwnershipLength,
      concatUint8Arrays(ownershipsBuffer),
      Uint8Array.from([bufUCOTransferLength.length]),
      bufUCOTransferLength,
      concatUint8Arrays(ucoTransfersBuffers),
      Uint8Array.from([bufTokenTransferLength.length]),
      bufTokenTransferLength,
      concatUint8Arrays(tokenTransfersBuffers),
      Uint8Array.from([bufRecipientLength.length]),
      bufRecipientLength,
      concatUint8Arrays(this.data.recipients)
    ])
  }

  originSignaturePayload() {
    const payloadForPreviousSignature = this.previousSignaturePayload()
    return concatUint8Arrays([
      payloadForPreviousSignature,
      this.previousPublicKey,
      Uint8Array.from([this.previousSignature.length]),
      this.previousSignature,
    ])
  }
}

