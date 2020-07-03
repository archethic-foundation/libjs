const TxBuilder = require('./lib/transaction_builder')
const API = require('./lib/api')
const Crypto = require('./lib/crypto')

module.exports = {
    
    /**
     * Create a new TransactionBuilder instance to forge transaction
     * @param {String} type Transaction type ("identity", "keychain", "transfer", "hosting")
     */
    newTransactionBuilder: function (type) {
        return new TxBuilder(type)
    },

    /**
     * Send the transaction to a node
     * @param {Object} tx Transaction to send
     * @param {String} endpoint Node endpoint
     */
    sendTransaction: function(tx, endpoint) {
        return API.sendTx(tx, endpoint)
    },

    /**
     * Derivate a keypair
     * @param {String} seed TransactionChain seed
     * @param {Integer} index Number of transaction in the chain
     * @param {String} curve  Elliptic curve to use ("ed25519", "P256", "secp256k1")
     */
    derivateKeyPair(seed, index, curve = "ed25519") {
        keypair = Crypto.derivateKeyPair(seed, index, curve)
        return {
            privateKey: keypair.privateKey.toString('hex'),
            publicKey: keypair.publicKey.toString('hex')
        }
    },

    /**
     * Derivate an address
     * @param {String} seed TransactionChain seed
     * @param {Integer} index Number of transaction in the chain
     * @param {String} curve  Elliptic curve to use ("ed25519", "P256", "secp256k1")
     * @param {String} hashAlgo  Hash algorithm ("sha256", "sha512", "sha3-256", "sha3-512", "blake2b")
     */
    derivateAddress(seed, index, curve = "ed25519", hashAlgo = "sha256") {
        keypair = Crypto.derivateKeyPair(seed, index, curve)
        return Crypto.hash(keypair.publicKey, hashAlgo).toString('hex')
    },

    /**
     * Encrypt data using the public key with an ECIES algorithm
     * @param {String} data Data to encrypt (hexadecimal)
     * @param {String} publicKey Public key (hexadecimal)
     */
    ecEncrypt: function (data, publicKey) {
        return Crypto.encrypt(Buffer.from(data, "hex"), Buffer.from(publicKey, 'hex')).toString('hex')
    }
}