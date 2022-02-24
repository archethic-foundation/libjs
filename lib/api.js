const fetch = require('cross-fetch')

const withAbsintheSocket = require("@absinthe/socket")
const { Socket } = require("phoenix")

module.exports = {
  /**
   * Send a transaction to the network
   * @param {Object} tx Transaction to send
   * @param {String} endpoint Node endpoint
   */
  sendTx: function (tx, endpoint) {
    return fetch(endpoint + "/api/transaction", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: tx.toJSON()
    })
      .then(r => r.json())
  },

  getTransactionIndex: function (address, endpoint) {
    return fetch(endpoint + "/api", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
                    lastTransaction(address: "${address}") {
                        chainLength
                    }
                }`
      })
    })
      .then(r => r.json())
      .then((res) => {
        if (res.data.lastTransaction == null) {
          return 0
        }
        else {
          return res.data.lastTransaction.chainLength
        }
      })
  },

  getStorageNoncePublicKey: function (endpoint) {
    return fetch(endpoint + "/api", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`
      })
    })
      .then(r => r.json())
      .then((res) => {
        if (res.data.sharedSecrets == null) {
          return ""
        }
        else {
          return res.data.sharedSecrets.storageNoncePublicKey
        }
      })
  },

  waitConfirmations: function (address, endpoint, handler) {
    const host = new URL(endpoint).host
    const absintheSocket = withAbsintheSocket.create(
      new Socket(`ws://${host}/socket`)
    );

    const operation = `
      subscription {
        transactionConfirmed(address: "${address}") {
          nbConfirmations
        }
      }
      `
    const notifier = withAbsintheSocket.send(absintheSocket, { operation })

    return withAbsintheSocket.observe(absintheSocket, notifier, {
      onAbort: console.log("abort"),
      onError: function (err) {
        throw err
      },
      onStart: console.log("open"),
      onResult: function (result) {
        if (result.data.transactionConfirmed) {
          return handler(result.data.transactionConfirmed.nbConfirmations)
        }

        throw result
      }
    })
  }
}
