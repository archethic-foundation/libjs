const Crypto = require('./crypto')
const { isHex, hexToUint8Array, uint8ArrayToHex, concatUint8Arrays, encodeInt32, encodeInt64, toBigInt} = require("./utils")

const version = 1

const txTypes = {
	//User based transaction types
	"keychain_access": 254,
	"keychain": 255,
	"transfer": 253,
	"hosting": 252,
	"nft": 251,
	//Network based transaction types
	"code_proposal": 7,
	"code_approval": 8
}

module.exports = class TransactionBuilder {

	/**
	 * Create a new instance of the transaction builder by specifying firstly the type of transaction
	 * @param {String} txType Transaction type ("keychain_access", "keychain", "transfer", "hosting", "code_proposal", "code_approval", "nft")
	 */
	constructor(txType) {

		if (!Object.keys(txTypes).includes(txType)) {
			throw "Transaction type must be 'transfer', 'hosting', 'keychain_access', 'keychain',  'nft', 'code_proposal', 'code_approval'"
		}

		this.version = version
		this.type = txType
		this.data = {
			content: new Uint8Array(),
			code: new Uint8Array(),
			keys: {
				secrets: [],
				authorizedKeys: []
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

		if (typeof(content) !== "string" && !(content instanceof Uint8Array)) {
			throw "'content' must be a string or Uint8Array"
		}

		if (typeof(content) == "string") {
			content = new TextEncoder().encode(content)
		}
		this.data.content = content;
		return this
	}

	/**
	 * Add a secret to the transaction with its authorized public keys
	 * @param {String | Uint8Array} secret Secret encrypted (hexadecimal or binary buffer)
	 * @param {Object<String | Uint8Array, String | Uint8Array>} authorizedKeys List of authorized keys
	 */
	addSecret(secret, authorizedKeys) {

		if (typeof(secret) !== "string" && !(secret instanceof Uint8Array)) {
			throw "'secret' must be a string or Uint8Array"
		}

		if (typeof(secret) == "string") {
			if (isHex(secret)) {
				secret = hexToUint8Array(secret)
			} else {
				secret = new TextEncoder().encode(secret)
			}

		}

		if (typeof(authorizedKeys) !== "object") {
			throw "'authorizedKeys must be an object"
		}

		let authorizedKeysBuf = []
		for (let publicKey in authorizedKeys) {
			if (typeof(publicKey) !== "string" && !(publicKey instanceof Uint8Array)) {
				throw "Authorized public key must be a string or Uint8Array"
			}

			let encryptedSecretKey = authorizedKeys[publicKey] 

			if (typeof(publicKey) == "string") {
				if (!isHex(publicKey)) {
					throw "Authorized public key must be an hexadecimal"
				}
				publicKey = hexToUint8Array(publicKey)
			}

			if (typeof(encryptedSecretKey) !== "string" && !(encryptedSecretKey instanceof Uint8Array)) {
				throw "Encrypted secret key must be a string or Uint8Array"
			}

			if (typeof(encryptedSecretKey) == "string") {
				if (!isHex(encryptedSecretKey)) {
					throw "Encrypted secret key must be an hexadecimal"
				}
				encryptedSecretKey = hexToUint8Array(encryptedSecretKey)
			}

			authorizedKeysBuf[publicKey] = encryptedSecretKey
		}

		this.data.keys.authorizedKeys.push(authorizedKeysBuf)
		this.data.keys.secrets.push(secret)
		return this
	}

	/**
	 * Add a UCO transfer to the transaction
	 * @param {String | Uint8Array} to Address of the recipient (hexadecimal or binary buffer)
	 * @param {Float} amount Amount of UCO to transfer
	 */
	addUCOTransfer(to, amount) {
		if (typeof(to) !== "string" && !(to instanceof Uint8Array)) {
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
			amount: toBigInt(amount)
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
		if (typeof(to) !== "string" && !(to instanceof Uint8Array)) {
			throw "'to' must be a string or Uint8Array"
		}

		if (typeof(nft_address) !== "string" && !(nft_address instanceof Uint8Array)) {
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
			amount: toBigInt(amount),
			nft: nft_address
		})
		return this
	}

	/**
	 * Add recipient to the transaction
	 * @param {String | Uint8Array} to Recipient address (hexadecimal or binary buffer) 
	 */
	addRecipient(to) {
		if (typeof(to) !== "string" && !(to instanceof Uint8Array)) {
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
		if (typeof(privateKey) !== "string" && !(privateKey instanceof Uint8Array)) {
			throw "'privateKey' must be a string or Uint8Array"
		}

		if (typeof(privateKey) == "string") {
			if (!isHex(privateKey)) {
				throw "'privateKey' must be in hexadecimal form if it's string"
			}
		}

		this.originSignature = Crypto.sign(this.originSignaturePayload(), privateKey)
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
				keys: {
					secrets: this.data.keys.secrets.map(uint8ArrayToHex),
					authorizedKeys: this.data.keys.authorizedKeys.map(keys => {
						let authorizedKeys = {}
						for(let publicKey in keys) {
							let encryptedSecretKey = keys[publicKey]

							publicKey = Uint8Array.from(publicKey.split(','))

							authorizedKeys[uint8ArrayToHex(publicKey)] = uint8ArrayToHex(encryptedSecretKey)
						}
						return authorizedKeys
					})
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

		const buf_code_size = encodeInt32(this.data.code.length)

		let content_size = this.data.content.length
		if (this.data.content instanceof ArrayBuffer) {
			content_size = this.data.content.byteLength
		}

		const buf_content_size = encodeInt32(content_size)

		const secretsBuffer = this.data.keys.secrets.map(secret => {
			return concatUint8Arrays([
				encodeInt32(secret.byteLength),
				secret
			])
		})

		const authorizedKeysBuffer = this.data.keys.authorizedKeys.map(authorizedKeysBySecret => {
			const nbAuthorizedKeys = Object.keys(authorizedKeysBySecret).length
			let buf = [Uint8Array.from([nbAuthorizedKeys])]

			for (let publicKey in authorizedKeysBySecret) {
				const encryptedSecretKey = authorizedKeysBySecret[publicKey]
				publicKey = Uint8Array.from(publicKey.split(','))

				buf.push(Uint8Array.from(publicKey))
				buf.push(encryptedSecretKey)
			}

			return concatUint8Arrays(buf)
		})

		const ucoTransfersBuffers = this.data.ledger.uco.transfers.map(function (transfer) {
			return concatUint8Arrays([
				transfer.to,
				encodeInt64(transfer.amount)
			])
		})

		const nftTransfersBuffers = this.data.ledger.nft.transfers.map(function (transfer) {
			return concatUint8Arrays([
				transfer.nft,
				transfer.to,
				encodeInt64(transfer.amount)
			])

		})
		return concatUint8Arrays([
			encodeInt32(version),
			this.address,
			Uint8Array.from([txTypes[this.type]]),
			buf_code_size,
			this.data.code,
			buf_content_size,
			this.data.content,
			Uint8Array.from([this.data.keys.secrets.length]),
			concatUint8Arrays(secretsBuffer),
			concatUint8Arrays(authorizedKeysBuffer),
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

