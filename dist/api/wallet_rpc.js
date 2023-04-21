import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from "json-rpc-2.0";
import { ConnectionState } from "./types.js";
export class RpcRequest {
    origin;
    version;
    payload;
    constructor(origin, payload = {}, version = 1) {
        this.origin = origin;
        this.version = version;
        this.payload = payload;
    }
}
export class ArchethicRPCClient {
    origin;
    client;
    websocket;
    _connectionStateEventTarget;
    _rpcNotificationEventTarget;
    static _instance;
    constructor() {
        this.origin = { name: '' };
        this.client;
        this.websocket;
        this._connectionStateEventTarget = new EventTarget();
        this._rpcNotificationEventTarget = new EventTarget();
    }
    static get instance() {
        if (!this._instance) {
            this._instance = new ArchethicRPCClient();
        }
        return this._instance;
    }
    setOrigin(origin) {
        this.origin = origin;
        return this;
    }
    _dispatchConnectionState() {
        this._connectionStateEventTarget.dispatchEvent(new Event(this.connectionState));
    }
    async connect(host, port) {
        return new Promise((resolve, reject) => {
            if (this.connectionState != ConnectionState.Closed) {
                return reject(new Error("Connection already established. Cancelling new connection request"));
            }
            this.websocket = new WebSocket(`ws://${host}:${port}`);
            this._dispatchConnectionState();
            this.client = new JSONRPCServerAndClient(new JSONRPCServer(), new JSONRPCClient((request) => {
                try {
                    this.websocket?.send(JSON.stringify(request));
                    return Promise.resolve();
                }
                catch (error) {
                    return Promise.reject(error);
                }
            }));
            this.client.addMethod('addSubscriptionNotification', (request) => {
                const notification = {
                    subscriptionId: request['subscriptionId'],
                    data: request['data']
                };
                this._rpcNotificationEventTarget.dispatchEvent(new CustomEvent(notification.subscriptionId, {
                    detail: notification.data
                }));
            });
            this.websocket.onmessage = (event) => {
                this.client?.receiveAndSend(JSON.parse(event.data.toString()));
            };
            this.websocket.onclose = (event) => {
                this.client?.rejectAllPendingRequests(`Connection is closed (${event.reason}).`);
                this.close();
            };
            this.websocket.onopen = (_) => {
                resolve();
                this._dispatchConnectionState();
            };
        });
    }
    async close() {
        this.websocket?.close();
        this.client = undefined;
        this.websocket = undefined;
        this._dispatchConnectionState();
    }
    _ensuresConnectionAlive() {
        if (this.client == null || this.connectionState != ConnectionState.Open)
            throw new Error('RPC connection must be alive.');
    }
    onAccountUpdate(accountName, listener) {
        return this._subscribe('subscribeAccount', {
            name: accountName
        }, listener);
    }
    _subscribe(method, data, listener) {
        this._ensuresConnectionAlive();
        return this.client?.request(method, new RpcRequest(this.origin, data)).then((result) => {
            const subscription = {
                id: result['subscriptionId'],
                eventListener: ((event) => listener(event.detail))
            };
            this._rpcNotificationEventTarget.addEventListener(subscription.id, subscription.eventListener);
            return subscription;
        });
    }
    unsubscribe(subscription) {
        this._rpcNotificationEventTarget.removeEventListener(subscription.id, subscription.eventListener);
    }
    get connectionState() {
        const state = this.websocket?.readyState;
        switch (state) {
            case WebSocket.CLOSING:
                return ConnectionState.Closing;
            case WebSocket.CONNECTING:
                return ConnectionState.Connecting;
            case WebSocket.OPEN:
                return ConnectionState.Open;
        }
        return ConnectionState.Closed;
    }
    onconnectionstatechange(listener) {
        this._connectionStateEventTarget.addEventListener(ConnectionState.Connecting, () => { listener(ConnectionState.Connecting); });
        this._connectionStateEventTarget.addEventListener(ConnectionState.Open, () => { listener(ConnectionState.Open); });
        this._connectionStateEventTarget.addEventListener(ConnectionState.Closed, () => { listener(ConnectionState.Closed); });
        return this;
    }
    unsubscribeconnectionstatechange() {
        this._connectionStateEventTarget.removeEventListener(ConnectionState.Connecting, null);
        this._connectionStateEventTarget.removeEventListener(ConnectionState.Open, null);
        this._connectionStateEventTarget.removeEventListener(ConnectionState.Closed, null);
        return this;
    }
    async getEndpoint() {
        this._ensuresConnectionAlive();
        return this.client?.request('getEndpoint', new RpcRequest(this.origin))
            .then((value) => {
            return value;
        });
    }
    async sendTransaction(transaction) {
        this._ensuresConnectionAlive();
        return this.client?.request('sendTransaction', new RpcRequest(this.origin, transaction))
            .then((result) => {
            return result;
        });
    }
    async signTransactions(transactions) {
        this._ensuresConnectionAlive();
        return this.client?.request('signTransactions', new RpcRequest(this.origin, transactions)).then((result) => {
            return result['signedTxs'];
        });
    }
    async addService(name) {
        this._ensuresConnectionAlive();
        return this.client?.request('addService', new RpcRequest(this.origin, { name: name })).then((result) => {
            return result;
        });
    }
    async getAccounts() {
        this._ensuresConnectionAlive();
        return this.client?.request('getAccounts', new RpcRequest(this.origin)).then((result) => {
            return result['accounts'];
        });
    }
    async getCurrentAccount() {
        this._ensuresConnectionAlive();
        return this.client?.request('getCurrentAccount', new RpcRequest(this.origin)).then((result) => {
            return result;
        });
    }
    async getServices() {
        this._ensuresConnectionAlive();
        return this.client?.request('getServicesFromKeychain', new RpcRequest(this.origin)).then((result) => {
            return result['services'];
        });
    }
    async keychainDeriveKeypair(serviceName, index = 0, pathSuffix = "") {
        this._ensuresConnectionAlive();
        return this.client?.request('keychainDeriveKeypair', new RpcRequest(this.origin, {
            serviceName: serviceName,
            index: index,
            pathSuffix: pathSuffix
        })).then((result) => {
            return result;
        });
    }
    async keychainDeriveAddress(serviceName, index = 0, pathSuffix = "") {
        this._ensuresConnectionAlive();
        return this.client?.request('keychainDeriveAddress', new RpcRequest(this.origin, {
            serviceName: serviceName,
            index: index,
            pathSuffix: pathSuffix
        })).then((result) => {
            return result;
        });
    }
    onCurrentAccountChange(listener) {
        return this._subscribe('subscribeCurrentAccount', {}, listener);
    }
}
//# sourceMappingURL=wallet_rpc.js.map