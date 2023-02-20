import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from "json-rpc-2.0";

export class ConnectionState {
    static Closed = 'WalletRPCConnection_closed'
    static Closing = 'WalletRPCConnection_closing'
    static Connecting = 'WalletRPCConnection_connecting'
    static Open = 'WalletRPCConnection_open'
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
    constructor() {
        /** @type {RpcRequestOrigin} origin */
        this.origin = new RpcRequestOrigin('')

        /** @type {JSONRPCServerAndClient | undefined} client */
        this.client;

        /** @type {WebSocket | undefined} websocket */
        this.websocket;

        /** @type {EventTarget} _connectionStateEventTarget */
        this._connectionStateEventTarget = new EventTarget()
    }

    /** @type {ArchethicRPCClient} */
    static _instance;

    /**
     * @return {ArchethicRPCClient}
     */
    static get instance() {
        if (this._instance === undefined) {
            this._instance = new ArchethicRPCClient()
        }
        return this._instance
    }

    /**
     * @param {RpcRequestOrigin} origin Identifying data about the client application.
     */
    setOrigin(origin) {
        this.origin = origin
        return this
    }

    _dispatchConnectionState() {
        this._connectionStateEventTarget.dispatchEvent(new Event(this.connectionState))
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
            this.websocket = new WebSocket(`ws://${host}:${port}`)
            this._dispatchConnectionState()

            this.client = new JSONRPCServerAndClient(
                new JSONRPCServer(),
                new JSONRPCClient((request) => {
                    console.log(`Client received request ${JSON.stringify(request)}`)
                    try {
                        this.websocket?.send(JSON.stringify(request))
                        return Promise.resolve()
                    } catch (error) {
                        console.log(error)
                        return Promise.reject(error)
                    }
                })
            )

            this.websocket.onmessage = (event) => {
                this.client?.receiveAndSend(JSON.parse(event.data.toString()))
            }



            // On close, make sure to reject all the pending requests to prevent hanging.
            this.websocket.onclose = (event) => {
                this.client?.rejectAllPendingRequests(
                    `Connection is closed (${event.reason}).`
                )
                this.close()
            }

            this.websocket.onopen = (_) => {
                resolve();
                this._dispatchConnectionState()
            }
        })
    }

    /**
     * @return {Promise<void>}
     */
    async close() {
        this.websocket?.close()
        this.client = undefined
        this.websocket = undefined
        this._dispatchConnectionState()
    }

    _ensuresConnectionAlive() {
        if (this.client == null || this.connectionState != ConnectionState.Open) throw new InvalidStateError('RPC connection must be alive.')
    }

    /**
     * @return {ConnectionState}
     */
    get connectionState() {
        const state = this.websocket?.readyState
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
     * @param {function(String)} listener
     * @return {ArchethicRPCClient}
     */
    onconnectionstatechange(listener) {
        this._connectionStateEventTarget.addEventListener(ConnectionState.Connecting, () => { listener(ConnectionState.Connecting) })
        this._connectionStateEventTarget.addEventListener(ConnectionState.Open, () => { listener(ConnectionState.Open) })
        this._connectionStateEventTarget.addEventListener(ConnectionState.Closed, () => { listener(ConnectionState.Closed) })
        return this
    }

    /**
     * @return {ArchethicRPCClient}
     */
    unsubscribeconnectionstatechange() {
        this._connectionStateEventTarget.removeEventListener(ConnectionState.Connecting)
        this._connectionStateEventTarget.removeEventListener(ConnectionState.Open)
        this._connectionStateEventTarget.removeEventListener(ConnectionState.Closed)
        return this
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
            new RpcRequest(this.origin, transaction),
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

