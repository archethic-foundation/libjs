const fetch = require('cross-fetch')

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
  }
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
