const fetch = require('cross-fetch')
const withAbsintheSocket = require("@absinthe/socket")
const { Socket } = require("phoenix")
const WebSocket = require("isomorphic-ws")

module.exports = {
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
      .then(handleResponse)
      .then((res) => {
        if (res.errors || res.data.lastTransaction == null) {
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
      .then(handleResponse)
      .then((res) => {
        if (res.errors || res.data.sharedSecrets == null) {
          return ""
        }
        else {
          return res.data.sharedSecrets.storageNoncePublicKey
        }
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
      .then(handleResponse)
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
      .then(handleResponse)
      .then((res) => {
        if (res.errors || res.data == null) {
          return []
        }
        else {
          return res.data.transaction.data.ownerships
        }
      })
  },

  addOriginKey: function (originPublicKey, certificate, endpoint) {
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
      .then(handleResponse)
  },
  
  getLastOracleData: function (endpoint) {
    return fetch(endpoint + "/api", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
                    oracleData {
                        timestamp,
                        services {
                          uco {
                            eur,
                            usd
                          }
                        }
                    }
                }`
      })
    })
      .then(handleResponse)
      .then((res) => {
        if (res.data.oracleData == null) {
          return {}
        }
        else {
          return res.data.oracleData
        }
      })
  },
  
  getOracleDataAt: function (timestamp, endpoint) {
    return fetch(endpoint + "/api", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
                    oracleData(timestamp: ${timestamp}) {
                        services {
                          uco {
                            eur,
                            usd
                          }
                        }
                    }
                }`
      })
    })
      .then(handleResponse)
      .then((res) => {
        if (res.data.oracleData == null) {
          return {}
        }
        else {
          return res.data.oracleData.services
        }
      })
  },
  
  subscribeToOracleUpdates: function (endpoint, handler) {
    const { host, protocol } = new URL(endpoint)
    ws_protocol = protocol == "https:" ? "wss" : "ws"

    const webSocket = new Socket(`${ws_protocol}://${host}/socket`, {
      transport: WebSocket
    });
    const absintheSocket = withAbsintheSocket.create(webSocket);

    const operation = `
      subscription {
        oracleUpdate {
          timestamp,
          services {
            uco {
              eur,
              usd
            }
          }
        }
      }
      `
    const notifier = withAbsintheSocket.send(absintheSocket, { operation })

    return new Promise((resolve, reject) => {
      withAbsintheSocket.observe(absintheSocket, notifier, {
        onStart: function () {
          resolve()
        },
        onError: function (err) {
          reject(err)
        },

        onResult: function (result) {
          handler(result.data.oracleUpdate)
        }
      })

    })
  },
}

function handleResponse(response) {
  return new Promise(function (resolve, reject) {
    if (response.status >= 200 && response.status <= 299) {
      response.json().then(resolve)
    }
    else {
      response.json().then(reject)
    }
  })
}
