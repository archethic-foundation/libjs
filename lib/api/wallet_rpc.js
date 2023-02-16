import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from "json-rpc-2.0";

export class ConnectionState {
    static Closed = 0
    static Closing = 1
    static Connecting = 2
    static Open = 3
}

export class InvalidStateError extends Error { }


export class RpcRequestOrigin {
    /**
     * @param {String} name 
     * @param {String | undefined} url 
     * @param {String | undefined} logo 
     */
    constructor(name, url, logo) {
        this.name = name
        this.url = url
        this.logo = logo
    }
}

export class RpcRequest {
    /**
     * @param {RpcRequestOrigin} origin Application emitting the request
     * @param {Object} payload Request payload
     * @param {number} version Wallet Rpc protocol version
     */
    constructor(origin, payload, version = 1) {
        this.origin = origin
        this.version = version
        this.payload = payload
    }
}


export class ArchethicRPCClient {
    /**
     * @param {RpcRequestOrigin} origin Identifying data about the client application.
     */
    constructor(origin) {
        /** @property {RpcRequestOrigin} origin */
        this.origin = origin

        /** @property {JSONRPCServerAndClient | undefined} client */
        this.client;

        /** @property {WebSocket | undefined} websocket */
        this.websocket;
    }

    /**
     * 
     * @param {string} host 
     * @param {number} port 
     * @returns {Promise<void>}
     */
    async connect(host, port) {
        return new Promise((resolve, reject) => {
            if (this.connectionState != ConnectionState.Closed) {
                return reject(new InvalidStateError("Connection already established. Cancelling new connection request"))
            }
            this.webSocket = new WebSocket(`ws://${host}:${port}`)

            this.client = new JSONRPCServerAndClient(
                new JSONRPCServer(),
                new JSONRPCClient((request) => {
                    console.log(`Client received request ${JSON.stringify(request)}`)
                    try {
                        this.webSocket?.send(JSON.stringify(request))
                        return Promise.resolve()
                    } catch (error) {
                        console.log(error)
                        return Promise.reject(error)
                    }
                })
            )

            this.webSocket.onmessage = (event) => {
                this.client?.receiveAndSend(JSON.parse(event.data.toString()))
            }



            // On close, make sure to reject all the pending requests to prevent hanging.
            this.webSocket.onclose = (event) => {
                this.client?.rejectAllPendingRequests(
                    `Connection is closed (${event.reason}).`
                )
                this.close()
            }

            this.webSocket.onopen = (event) => {
                resolve();
            }
        })
    }

    /**
     * @return {Promise<void>}
     */
    async close() {
        this.webSocket?.close()
        this.client = undefined
        this.webSocket = undefined
    }

    _ensuresConnectionAlive() {
        if (this.client == null || this.connectionState != ConnectionState.Open) throw InvalidStateError('RPC connection must be alive.')
    }

    /**
     * @return {ConnectionState}
     */
    get connectionState() {
        const state = this.webSocket?.readyState
        switch (state) {
            case WebSocket.CLOSING:
                return ConnectionState.Closing
            case WebSocket.CONNECTING:
                return ConnectionState.Connecting
            case WebSocket.OPEN:
                return ConnectionState.Open
        }
        return ConnectionState.Closed
    }

    /**
     * @return {Promise<String>} Keychain endpoint URL.
     */
    async getEndpoint() {
        this._ensuresConnectionAlive();

        return this.client?.request('getEndpoint')
            .then(
                (value) => {
                    return value;
                },
                (_) => {
                    throw 'Unable to get Keychain endpoint.';
                }
            )
    }

    /**
     * Signs and sends a Transaction in one of the Keychain services.
     * 
     * 
     * @param {Object} transaction Object is a raw transaction. For example, a NFT creation transaction would look like this :
     * ```
     * {
     *  "type": "token",
     *  "version": 1,
     *  "data": {
     *  	"content": "{ \"name\": \"NFT 001\", \"supply\": 100000000, \"type\": \"non-fungible\", \"symbol\": \"NFT1\", \"aeip\": [2], \"properties\": {}}",
     *  	"code": "",
     *  	"ownerships":[],
     *  	"ledger": {
     *  		"uco": {
     *  			"transfers": []
     *  		},
     *  		"token": {
     *  			"transfers": []
     *  		}
     *  	},
     *  	"recipients": []
     *  }
     * }
     * ```
     * 
     * @returns {Promise<TransactionSuccess>}
     */
    async sendTransaction(transaction) {
        this._ensuresConnectionAlive();

        return this.client?.request(
            'sendTransaction',
            RpcRequest(origin, transaction),
        )
            .then(
                (result) => {
                    return result;
                },
                (_) => {
                    throw 'Transaction send failed.'
                }
            )
    }
}

