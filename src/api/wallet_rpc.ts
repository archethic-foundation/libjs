import TransportWebSocket from "isomorphic-ws";
import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient } from "json-rpc-2.0";
import { ExtendedTransactionBuilder } from "../transaction";
import TransactionBuilder from "../transaction_builder";
import { Service } from "../types";
import {
  AccountIdentity,
  ConnectionState,
  Endpoint,
  RpcNotification,
  RpcRequestOrigin,
  RpcSubscription,
  SignedTransaction,
  TransactionSuccess
} from "./types.js";

export class RpcRequest {
  private origin: RpcRequestOrigin;
  private version: number;
  private payload: {};
  /**
   * @param {RpcRequestOrigin} origin Application emitting the request
   * @param {Object} payload Request payload
   * @param {number} version Wallet Rpc protocol version
   */
  constructor(origin: RpcRequestOrigin, payload: object = {}, version: number = 1) {
    this.origin = origin;
    this.version = version;
    this.payload = payload;
  }
}

enum StreamChannelState {
  CONNECTING,
  OPEN,
  CLOSING,
  CLOSED,
}
interface StreamChannel<T> {
  get state(): StreamChannelState;

  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: T): Promise<void>;
  onReceive: ((data: T) => Promise<void>) | null;
  onReady: (() => Promise<void>) | null;
  onClose: ((reason: string) => Promise<void>) | null;
}

class WebsocketStreamChannel implements StreamChannel<string> {
  private websocket: TransportWebSocket | undefined;

  constructor(
    websocket: TransportWebSocket
  ) {
    this.websocket = websocket;
  }

  async connect(): Promise<void> { }

  async close(): Promise<void> {
    this.websocket.close();
  }

  async send(data: string): Promise<void> {
    await this.websocket.send(data);
  }

  private _onReceive: ((data: string) => Promise<void>) | null = null;
  get onReceive() { return this._onReceive };
  set onReceive(onReceive: ((data: string) => Promise<void>) | null) {
    this._onReceive = onReceive;

    this.websocket.onmessage =
      this._onReceive === null ?
        null :
        (event: any) => {
          this._onReceive!(event.data.toString());
        }
  }

  private _onReady: (() => Promise<void>) | null = null;
  get onReady() { return this._onReady };
  set onReady(onReady: (() => Promise<void>) | null) {
    this._onReady = onReady;
    this.websocket.onopen = this._onReady === null ?
      null :
      (_: any) => {
        this._onReady!();
      }
  }

  private _onClose: ((reason: string) => Promise<void>) | null = null;
  get onClose() { return this._onClose };
  set onClose(onClose: ((reason: string) => Promise<void>) | null) {
    this._onClose = onClose;
    this.websocket.onclose = this._onClose === null ?
      null :
      (event: any) => {
        this._onClose!(event.reason);
      }
  }

  get state(): StreamChannelState {
    switch (this.websocket.readyState) {
      case TransportWebSocket.CONNECTING: return StreamChannelState.CONNECTING;
      case TransportWebSocket.OPEN: return StreamChannelState.OPEN;
      case TransportWebSocket.CLOSING: return StreamChannelState.CLOSING;
      default: return StreamChannelState.CLOSED;
    }
  }
}

export class ArchethicRPCClient {
  private origin: RpcRequestOrigin;
  private client: JSONRPCServerAndClient | undefined;
  private channel: StreamChannel<string> | undefined;
  private _connectionStateEventTarget: EventTarget;
  private _rpcNotificationEventTarget: EventTarget;
  static _instance: ArchethicRPCClient;
  constructor() {
    this.origin = { name: "" };
    this._connectionStateEventTarget = new EventTarget();
    this._rpcNotificationEventTarget = new EventTarget();
  }

  /**
   * @return {ArchethicRPCClient}
   */
  static get instance(): ArchethicRPCClient {
    if (!this._instance) {
      this._instance = new ArchethicRPCClient();
    }
    return this._instance;
  }

  /**
   * @param {RpcRequestOrigin} origin Identifying data about the client application.
   */
  setOrigin(origin: RpcRequestOrigin): this {
    this.origin = origin;
    return this;
  }

  _dispatchConnectionState() {
    this._connectionStateEventTarget.dispatchEvent(new Event(this.connectionState));
  }

  /**
   *
   * @param {string} host
   * @param {number} port
   * @returns {Promise<void>}
   */
  async connectWebsocket(host: string, port: number): Promise<void> {
    await this.connect(new WebsocketStreamChannel(new WebSocket(`ws://${host}:${port}`)));
  }


  /**
   *
   * @param {StreamChannel} streamChannel
   * @returns {Promise<void>}
   */
  async connect(streamChannel: StreamChannel<string>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState != ConnectionState.Closed) {
        return reject(new Error("Connection already established. Cancelling new connection request"));
      }
      this.channel = streamChannel;
      this._dispatchConnectionState();

      this.client = new JSONRPCServerAndClient(
        new JSONRPCServer(),
        new JSONRPCClient((request) => {
          try {
            this.channel?.send(JSON.stringify(request));
            return Promise.resolve();
          } catch (error) {
            return Promise.reject(error);
          }
        })
      );
      this.client.addMethod("addSubscriptionNotification", (request) => {
        const notification: RpcNotification = {
          subscriptionId: request["subscriptionId"],
          data: request["data"]
        };
        this._rpcNotificationEventTarget.dispatchEvent(
          new CustomEvent(notification.subscriptionId, {
            detail: notification.data
          })
        );
      });

      this.channel.onReceive = async (data) => {
        this.client?.receiveAndSend(JSON.parse(data));
      };

      // On close, make sure to reject all the pending requests to prevent hanging.
      this.channel.onClose = async (reason) => {
        this.client?.rejectAllPendingRequests(`Connection is closed (${reason}).`);
        this.close();
      };

      this.channel.onReady = async () => {
        resolve();
        this._dispatchConnectionState();
      };
    });
  }

  /**
   * @return {Promise<void>}
   */
  async close(): Promise<void> {
    this.channel?.close();
    this.client = undefined;
    this.channel = undefined;
    this._dispatchConnectionState();
  }

  _ensuresConnectionAlive(): void {
    if (this.client == null || this.connectionState != ConnectionState.Open)
      throw new Error("RPC connection must be alive.");
  }

  /**
   * Starts listening to account updates.
   *
   * @param {string} accountName
   * @param {function(AccountUpdate)} listener
   * @return {Promise<RpcSubscription>} created subscription
   */
  onAccountUpdate(accountName: string, listener: Function): PromiseLike<RpcSubscription> | undefined {
    return this._subscribe(
      "subscribeAccount",
      {
        name: accountName
      },
      listener
    );
  }

  /**
   * Starts listening to account updates.
   *
   * @param {string} method
   * @param {string} data
   * @param {function(AccountUpdate)} listener
   * @return {Promise<RpcSubscription>} created subscription
   */
  _subscribe(method: string, data: object, listener: Function): PromiseLike<RpcSubscription> | undefined {
    this._ensuresConnectionAlive();

    return this.client?.request(method, new RpcRequest(this.origin, data)).then((result) => {
      const subscription: RpcSubscription = {
        id: result["subscriptionId"],
        eventListener: (event: any) => listener(event.detail)
      };

      this._rpcNotificationEventTarget.addEventListener(subscription.id, subscription.eventListener);

      return subscription;
    });
  }

  /**
   * Stops listening to a subscription
   * @param {RpcSubscription} subscription
   */
  unsubscribe(subscription: RpcSubscription) {
    this._rpcNotificationEventTarget.removeEventListener(subscription.id, subscription.eventListener);
  }

  /**
   * @return {ConnectionState}
   */
  get connectionState(): ConnectionState {
    switch (this.channel?.state) {
      case StreamChannelState.CLOSING:
        return ConnectionState.Closing;
      case StreamChannelState.CONNECTING:
        return ConnectionState.Connecting;
      case StreamChannelState.OPEN:
        return ConnectionState.Open;
      default:
        return ConnectionState.Closed;
    }
  }

  /**
   * @param {function(String)} listener
   * @return {ArchethicRPCClient}
   */
  onconnectionstatechange(listener: Function): this {
    this._connectionStateEventTarget.addEventListener(ConnectionState.Connecting, () => {
      listener(ConnectionState.Connecting);
    });
    this._connectionStateEventTarget.addEventListener(ConnectionState.Open, () => {
      listener(ConnectionState.Open);
    });
    this._connectionStateEventTarget.addEventListener(ConnectionState.Closed, () => {
      listener(ConnectionState.Closed);
    });
    return this;
  }

  /**
   * @return {ArchethicRPCClient}
   */
  unsubscribeconnectionstatechange(): this {
    this._connectionStateEventTarget.removeEventListener(ConnectionState.Connecting, null);
    this._connectionStateEventTarget.removeEventListener(ConnectionState.Open, null);
    this._connectionStateEventTarget.removeEventListener(ConnectionState.Closed, null);
    return this;
  }

  /**
   * @return {Promise<Endpoint>} Keychain endpoint URL.
   */
  async getEndpoint(): Promise<Endpoint> {
    this._ensuresConnectionAlive();

    return this.client?.request("getEndpoint", new RpcRequest(this.origin));
  }

  /**
   * Signs and sends a Transaction in one of the Keychain services.
   *
   *
   * @param {TransactionBuilder | ExtendedTransactionBuilder} transaction Transaction to sign and send.
   * @returns {Promise<TransactionSuccess>}
   */
  async sendTransaction(transaction: TransactionBuilder | ExtendedTransactionBuilder): Promise<TransactionSuccess> {
    this._ensuresConnectionAlive();
    return this.client?.request("sendTransaction", new RpcRequest(this.origin, transaction.toWalletRPC()));
  }

  /**
   * Signs many transactions.
   * @param {TransactionBuilder[] | ExtendedTransactionBuilder[]} transactions Transactions to sign.
   * @param {string} serviceName Name of the service to use.
   * @param {string} pathSuffix Path suffix to use.
   * @returns {Promise<SignedTransaction[]>}
   */
  async signTransactions(
    serviceName: string,
    pathSuffix: string,
    transactions: TransactionBuilder[] | ExtendedTransactionBuilder[]
  ): Promise<TransactionBuilder[] | ExtendedTransactionBuilder[]> {
    this._ensuresConnectionAlive();
    const txs = transactions.map((tx) => tx.toWalletRPC());
    return this.client!.request(
      "signTransactions",
      new RpcRequest(this.origin, {
        serviceName: serviceName,
        pathSuffix: pathSuffix,
        transactions: txs
      })
    ).then((result: { signedTxs: SignedTransaction[] }) => {
      for (let i = 0; i < result.signedTxs.length; i++) {
        transactions[i].setAddress(result.signedTxs[i].address);
        transactions[i].setPreviousSignatureAndPreviousPublicKey(
          result.signedTxs[i].previousSignature,
          result.signedTxs[i].previousPublicKey
        );
        transactions[i].setOriginSign(result.signedTxs[i].originSignature);
      }
      return transactions;
    });
  }

  /**
   * Add a service in the keychain
   *
   * @param {String} name Name of the service to be added
   * @returns {Promise<TransactionSuccess>}
   */
  async addService(name: string): Promise<TransactionSuccess> {
    this._ensuresConnectionAlive();

    return this.client?.request("addService", new RpcRequest(this.origin, { name: name }));
  }

  /**
   * Gets the accounts list.
   *
   * @returns {Promise<AccountIdentity[]>}
   */
  async getAccounts(): Promise<AccountIdentity[]> {
    this._ensuresConnectionAlive();

    return this.client?.request("getAccounts", new RpcRequest(this.origin)).then((result) => {
      return result["accounts"];
    });
  }

  /**
   * Gets the currently selected account.
   *
   * @returns {Promise<AccountIdentity>}
   */
  async getCurrentAccount(): Promise<AccountIdentity> {
    this._ensuresConnectionAlive();

    return this.client?.request("getCurrentAccount", new RpcRequest(this.origin));
  }

  /**
   * Gets the services list from the keychain
   *
   * @returns {Promise<Service[]>}
   */
  async getServices(): Promise<Service[]> {
    this._ensuresConnectionAlive();

    return this.client?.request("getServicesFromKeychain", new RpcRequest(this.origin)).then((result) => {
      return result["services"];
    });
  }

  /**
   * Derive a keypair for the given service at the index given and get the public key
   *
   * @param {String} serviceName
   * @param {Number} index
   * @param {String} pathSuffix
   * @returns {Promise<{"publicKey": string}>}
   */
  async keychainDeriveKeypair(serviceName: string, index = 0, pathSuffix = ""): Promise<{ publicKey: string }> {
    this._ensuresConnectionAlive();

    return this.client?.request(
      "keychainDeriveKeypair",
      new RpcRequest(this.origin, {
        serviceName: serviceName,
        index: index,
        pathSuffix: pathSuffix
      })
    );
  }

  /**
   * Derive an address for the given service at the index given
   *
   * @param {String} serviceName
   * @param {Number} index
   * @param {String} pathSuffix
   * @returns {Promise<{"address": string}>}
   */
  async keychainDeriveAddress(
    serviceName: string,
    index: number = 0,
    pathSuffix: string = ""
  ): Promise<{ address: string }> {
    this._ensuresConnectionAlive();

    return this.client?.request(
      "keychainDeriveAddress",
      new RpcRequest(this.origin, {
        serviceName: serviceName,
        index: index,
        pathSuffix: pathSuffix
      })
    );
  }

  /**
   * Starts listening to current account updates.
   *
   * @param {function(AccountUpdate)} listener
   * @return {Promise<RpcSubscription>} created subscription
   */
  onCurrentAccountChange(listener: Function): PromiseLike<RpcSubscription> | undefined {
    return this._subscribe("subscribeCurrentAccount", {}, listener);
  }

  /**
   * Refreshes the current account.
   *
   */
  refreshCurrentAccount(): void {
    this._ensuresConnectionAlive();

    this.client?.request("refreshCurrentAccount", new RpcRequest(this.origin));
  }
}
