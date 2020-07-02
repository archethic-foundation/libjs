const TxBuilder = require('./lib/transaction_builder')
const API = require('./lib/api')
const Crypto = require('./lib/crypto')

module.exports = {
    
    newTransactionBuilder: function (type) {
        return new TxBuilder(type)
    },

    sendTransaction: function(tx, endpoint) {
        return API.sendTx(tx, endpoint)
    },

    ecEncrypt: function (data, publicKey) {
        return Crypto.encrypt(data, publicKey)
    }
}