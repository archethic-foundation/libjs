module.exports = {
    sendTx: function(tx, endpoint) {
        return fetch(endpoint + "/api", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: `mutation {
                    newTransaction(
                        address: "${tx.address.toString('hex')}",
                        type: ${tx.type.toUpperCase()},
                        timestamp: ${tx.timestamp},
                        data: {
                            code: "${tx.data.code}",
                            content: "${tx.data.content}",
                            keys: {
                                secret: "${tx.data.keys.secret}",
                                authorizedKeys: [ ${authorizedKeysString(tx.data.keys.authorizedKeys)} ]
                            },
                            ledger: {
                                uco: {
                                    transfers: [ ${transfersToString(tx.data.ledger.uco.transfers)} ]
                                }
                            },
                            recipients: [
                                ${recipientsToString(tx.data.recipients)}
                            ]
                        },
                        previousPublicKey: "${tx.previousPublicKey}",
                        previousSignature: "${tx.previousSignature}",
                        originSignature: "${tx.originSignature}"
                    )
                }`
            })
        })
        .then(r => r.json())
    }
}

function authorizedKeysString(autorizedKeys) {
    let authorizedKeysStrings = []
    for (const publicKey in autorizedKeys) {
        authorizedKeysStrings.push(`{ publicKey: "${publicKey}", encryptedKey: "${autorizedKeys[publicKey]}"}`)
    }
    
    return authorizedKeysStrings.join(", ")
}

function transfersToString(transfers) {
    return transfers.map(function (transfer) {
        return `{ to: "${transfer.to}", amount: ${amount}}`
    })
    .join(", ")
}

function recipientsToString(recipients) {
    return recipients.map(function (recipient) {
        return `${recipient}`
    })
    .join(", ")
}