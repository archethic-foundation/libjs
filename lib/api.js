module.exports = {
    /**
     * Send a transaction to the network
     * @param {Object} tx Transaction to send
     * @param {String} endpoint Node endpoint
     */
    sendTx: function(tx, endpoint) {
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

    getLastTransaction: function (address, endpoint) {
        return fetch(endpoint + "/api", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: `query {
                    lastTransaction(address: "${address}") {
                        address
                    }
                }`
            })
        })
        .then(r => r.json())
        .then((res) => {
            if (res.data.lastTransaction == null) {
                return ""
            }
            else {
                return res.data.lastTransaction.address
            }
        })
    },

    getTransactionChain: function (address, endpoint) {
        return fetch(endpoint + "/api", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: `query {
                    transactionChain(address: "${address}") {
                        address
                    }
                }`
            })
        })
        .then(r => r.json())
        .then((res) => {
            if (res.data.transactionChain == null) {
                return []
            }
            else {
                const ret = [];
                for (let tx of res.data.transactionChain) {
                    ret.push(tx.address);
                }
                return ret
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
    }
}