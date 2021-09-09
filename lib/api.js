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
                        address, type, chainLength,
                        inputs { 
                            amount, from, nftAddress, timestamp, type,
                        }
                        validationStamp {
                            timestamp,
                            ledgerOperations { 
                                fee,
                            }
                        }
                        data {
                            content,
                            ledger { 
                                uco { 
                                    transfers { 
                                        amount, to,
                                    }
                                }
                                nft { 
                                    transfers { 
                                        amount, to, nft,
                                    }
                                }
                            }
                        }
                    }
                }`
            })
        })
        .then(r => r.json())
        .then((res) => {
            return res.data.lastTransaction
        })
    },

    getTransactionChain: function (address, page, endpoint) {
        return fetch(endpoint + "/api", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: `query {
                    transactionChain(address: "${address}", page: ${page}) {
                        address, type, chainLength,
                        inputs { 
                            amount, from, nftAddress, timestamp, type,
                        }
                        validationStamp {
                            timestamp,
                            ledgerOperations { 
                                fee,
                            }
                        }
                        data {
                            content,
                            ledger { 
                                uco { 
                                    transfers { 
                                        amount, to,
                                    }
                                }
                                nft { 
                                    transfers { 
                                        amount, to, nft,
                                    }
                                }
                            }
                        }
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
                return res.data.transactionChain
            }
        })
    },

    getLastAddressBalance: function (address, endpoint) {
        return fetch(endpoint + "/api", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: `query {
                    lastTransaction(address: "${address}") {
                        balance {
                            uco
                            nft {
                                address, amount
                            }
                        }
                    }
                }`
            })
        })
        .then(r => r.json())
        .then((res) => {
            if (res.data.lastTransaction == null) {
                return null
            }
            else {
                return res.data.lastTransaction.balance
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
