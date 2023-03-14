import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from "json-rpc-2.0";

export class ConnectionState {
    static Closed = 'WalletRPCConnection_closed'
    static Closing = 'WalletRPCConnection_closing'
    static Connecting = 'WalletRPCConnection_connecting'
    static Open = 'WalletRPCConnection_open'
}

export class RpcErrorCode {
    static UnsupportedMethod = -32601
    static Timeout = 5001
    static Connectivity = 4901
    static ConsensusNotReached = 5002
    static InvalidParams = -32602
    static InvalidTransaction = 5003
    static InvalidConfirmation = 5006
    static InsufficientFunds = 5004
    static ServiceNotFound = 5007
    static UserRejected = 4001
    static UnknownAccount = 5005
    static Other = 5000
}

export class RpcSubscription {
    /**
     * @param {String} id 
     * @param {EventListenerOrEventListenerObject} eventListener
     */
    constructor(id, eventListener) {
        this.id = id
        this.eventListener = eventListener
    }
}

export class RpcNotification {
    /**
     * @param {String} subscriptionId 
     * @param {Object} data 
     */
    constructor(subscriptionId, data) {
        this.subscriptionId = subscriptionId
        this.data = data
    }
}

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
    constructor(origin, payload = {}, version = 1) {
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

        /** @type {EventTarget} _rpcNotificationEventTarget */
        this._rpcNotificationEventTarget = new EventTarget()
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
                return reject(new Error("Connection already established. Cancelling new connection request"))
            }
            this.websocket = new WebSocket(`ws://${host}:${port}`)
            this._dispatchConnectionState()

            this.client = new JSONRPCServerAndClient(
                new JSONRPCServer(),
                new JSONRPCClient((request) => {
                    try {
                        this.websocket?.send(JSON.stringify(request))
                        return Promise.resolve()
                    } catch (error) {
                        return Promise.reject(error)
                    }
                })
            )
            this.client.addMethod(
                'subscribeAccountValue',
                (request) => {
                    const notification = new RpcNotification(
                        request['subscriptionId'],
                        request['data']
                    )
                    this._rpcNotificationEventTarget.dispatchEvent(new CustomEvent(
                        notification.subscriptionId,
                        {
                            detail: notification.data
                        }
                    ))
                }
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
        if (this.client == null || this.connectionState != ConnectionState.Open) throw new Error('RPC connection must be alive.')
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

        return this.client?.request(
            'getEndpoint',
            new RpcRequest(this.origin),
        )
            .then(
                (value) => {
                    return value;
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
                }
            )
    }

    /**
     * Signs and sends a Transaction in one of the Keychain services.
     * 
     * @returns {Promise<AccountIdentity>}
     */
    async getAccounts() {
        this._ensuresConnectionAlive();

        return this.client?.request(
            'getAccounts',
            new RpcRequest(this.origin),
        ).then(
            (result) => {
                return result['accounts']
            }
        )
    }

    /**
     * Starts listening to account updates.
     * 
     * @param {string} accountName
     * @param {function(AccountUpdate)} listener
     * @return {Promise<RpcSubscription>} created subscription
     */
    onAccountChange(accountName, listener) {
        return this._subscribe(
            'subscribeAccount',
            {
                name: accountName
            },
            listener
        )
    }

    /**
     * Starts listening to account updates.
     * 
     * @param {string} method
     * @param {string} data
     * @param {function(AccountUpdate)} listener
     * @return {Promise<RpcSubscription>} created subscription
     */
    _subscribe(method, data, listener) {
        this._ensuresConnectionAlive();

        return this.client?.request(
            method,
            new RpcRequest(
                this.origin,
                data,
            ),
        ).then(
            (result) => {
                const subscription = new RpcSubscription(
                    result['subscriptionId'],
                    (event) => listener(event.detail)
                )

                this._rpcNotificationEventTarget.addEventListener(
                    subscription.id,
                    subscription.eventListener
                )

                return subscription
            }
        )
    }

    /**
     * Stops listening to a subscription
     * @param {RpcSubscription} subscription
     */
    unsubscribe(subscription) {
        this._rpcNotificationEventTarget.removeEventListener(subscription.id, subscription.eventListener)
    }
}

