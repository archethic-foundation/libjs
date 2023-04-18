import { AccountIdentity, ConnectionState, Endpoint, RpcRequestOrigin, RpcSubscription, TransactionSuccess, SignedTransaction } from "./types.js";
import { Service } from "../types";
export declare class RpcRequest {
    private origin;
    private version;
    private payload;
    constructor(origin: RpcRequestOrigin, payload?: {}, version?: number);
}
export declare class ArchethicRPCClient {
    private origin;
    private client;
    private websocket;
    private _connectionStateEventTarget;
    private _rpcNotificationEventTarget;
    static _instance: ArchethicRPCClient;
    constructor();
    static get instance(): ArchethicRPCClient;
    setOrigin(origin: RpcRequestOrigin): ArchethicRPCClient;
    _dispatchConnectionState(): void;
    connect(host: string, port: number): Promise<void>;
    close(): Promise<void>;
    _ensuresConnectionAlive(): void;
    onAccountUpdate(accountName: string, listener: Function): PromiseLike<RpcSubscription> | undefined;
    _subscribe(method: string, data: object, listener: Function): PromiseLike<RpcSubscription> | undefined;
    unsubscribe(subscription: RpcSubscription): void;
    get connectionState(): ConnectionState;
    onconnectionstatechange(listener: Function): ArchethicRPCClient;
    unsubscribeconnectionstatechange(): this;
    getEndpoint(): Promise<Endpoint>;
    sendTransaction(transaction: Object): Promise<TransactionSuccess>;
    signTransactions(transactions: object[]): Promise<SignedTransaction[]>;
    addService(name: string): Promise<TransactionSuccess>;
    getAccounts(): Promise<AccountIdentity[]>;
    getCurrentAccount(): Promise<AccountIdentity>;
    getServices(): Promise<Service[]>;
    keychainDeriveKeypair(serviceName: string, index?: number, pathSuffix?: string): Promise<{
        "publicKey": string;
    }>;
    keychainDeriveAddress(serviceName: string, index?: number, pathSuffix?: string): Promise<{
        "address": string;
    }>;
    onCurrentAccountChange(listener: Function): PromiseLike<RpcSubscription> | undefined;
}
