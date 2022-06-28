const fetch = require('cross-fetch')

const withAbsintheSocket = require("@absinthe/socket")
const { Socket } = require("phoenix")
const WebSocket = require("isomorphic-ws")

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
    const {host, protocol} = new URL(endpoint)
    ws_protocol = protocol == "https:" ? "wss" : "ws"

    const webSocket = new Socket(`${ws_protocol}://${host}/socket`,{
      transport: WebSocket
    });
    const absintheSocket = withAbsintheSocket.create(webSocket);

    const operation = `
      subscription {
        transactionConfirmed(address: "${address}") {
          nbConfirmations
        }
      }
      `
    const notifier = withAbsintheSocket.send(absintheSocket, { operation })

    return new Promise((resolve, reject) => {
      withAbsintheSocket.observe(absintheSocket, notifier, {
        onStart: function() {
          resolve()
        },
        onError: function (err) {
          reject(err)
        },

        onResult: function (result) {
          if (result.data.transactionConfirmed) {
            handler(result.data.transactionConfirmed.nbConfirmations)
          }
        }
      })

    })

  },

  getTransactionFee: function (tx, endpoint) {
    return fetch(endpoint + "/api/transaction_fee", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: tx.toJSON()
    })
    .then(r => r.json())
  },

  getTransactionOwnerships: function (address, endpoint) {
    return fetch(endpoint + "/api", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
                    transaction(address: "${address}") {
                      data {
                        ownerships {
                          secret,
                          authorizedPublicKeys {
                            encryptedSecretKey,
                            publicKey
                          }
                        }
                      }
                    }
                }`
      })
    })
    .then(r => r.json())
    .then((res) => {
      if (res.data == null) {
        return []
      }
      else {
        return res.data.transaction.data.ownerships
      }
    })
  },

  addOriginKey: function(originPublicKey, certificate, endpoint) {
    return fetch(endpoint + "/api/origin_key", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        origin_public_key: originPublicKey,
        certificate: certificate
      })
    })
    .then(r => r.json())
  }
}
