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
            body: JSON.stringify({
                address: tx.address.toString('hex'),
                type: tx.type,
                timestamp: tx.timestamp,
                data: {
                    content: tx.data.content.toString('hex'),
                    code: tx.data.code,
                    keys: {
                        secret: tx.data.keys.secret.toString('hex'),
                        authorizedKeys: hexAuthorizedKeys(tx.data.keys.authorizedKeys)
                    },
                    ledger: {
                        uco: {
                            transfers: tx.data.ledger.uco.transfers.map((t) => {
                                return {
                                    to: t.to.toString('hex'),
                                    amount: t.amount
                                }
                            })
                        }
                    },
                    recipients: tx.data.recipients.map((r) => r.toString('hex'))
                },
                previousPublicKey: tx.previousPublicKey.toString('hex'),
                previousSignature: tx.previousSignature.toString('hex'),
                originSignature: tx.originSignature.toString('hex')
            })
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
    }
}

function hexAuthorizedKeys(autorizedKeys) {
    let authorizedKeysHex = []
    for (const publicKey in autorizedKeys) {
        authorizedKeysHex[publicKey.toString('hex')] = autorizedKeys[publicKey].toString('hex')
    }
    return authorizedKeysHex
}